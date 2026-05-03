-- Custom Forex System Schema
-- Admin can create custom forex pairs with controlled pricing

-- Custom Forex Pairs table
CREATE TABLE IF NOT EXISTS custom_forex_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Pricing (admin controlled)
  base_price DECIMAL(20, 8) NOT NULL DEFAULT 1.0,
  current_price DECIMAL(20, 8) NOT NULL DEFAULT 1.0,
  price_volatility DECIMAL(5, 4) DEFAULT 0.001, -- Price movement range (0.1%)
  
  -- Market hours
  market_open_time TIME DEFAULT '00:00:00',
  market_close_time TIME DEFAULT '23:59:59',
  trading_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Mon, 7=Sun
  is_market_open BOOLEAN DEFAULT true,
  
  -- Win rate control (0-1, where 1 = 100% player wins)
  -- Admin can set this to influence trade outcomes
  player_win_rate DECIMAL(3, 2) DEFAULT 0.50, -- 50% default
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_demo_only BOOLEAN DEFAULT false, -- If true, only available in demo mode
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Forex Trades table
CREATE TABLE IF NOT EXISTS custom_forex_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  forex_id UUID NOT NULL REFERENCES custom_forex_pairs(id) ON DELETE CASCADE,
  
  -- Trade details
  type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
  quantity DECIMAL(20, 8) NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  exit_price DECIMAL(20, 8),
  
  -- Trade outcome (admin can influence via win rate)
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  profit_loss DECIMAL(20, 2),
  profit_loss_percent DECIMAL(10, 4),
  
  -- Mode
  mode VARCHAR(10) DEFAULT 'demo' CHECK (mode IN ('demo', 'real')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  
  -- Calculate profit/loss on close
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- Price history for chart data
CREATE TABLE IF NOT EXISTS custom_forex_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forex_id UUID NOT NULL REFERENCES custom_forex_pairs(id) ON DELETE CASCADE,
  price DECIMAL(20, 8) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for fast lookup
  CONSTRAINT fk_forex FOREIGN KEY (forex_id) REFERENCES custom_forex_pairs(id)
);

-- Create indexes
CREATE INDEX idx_custom_forex_pairs_active ON custom_forex_pairs(is_active);
CREATE INDEX idx_custom_forex_trades_user ON custom_forex_trades(user_id);
CREATE INDEX idx_custom_forex_trades_forex ON custom_forex_trades(forex_id);
CREATE INDEX idx_custom_forex_trades_status ON custom_forex_trades(status);
CREATE INDEX idx_price_history_forex_time ON custom_forex_price_history(forex_id, timestamp DESC);

-- RLS Policies
ALTER TABLE custom_forex_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_forex_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_forex_price_history ENABLE ROW LEVEL SECURITY;

-- Everyone can view active forex pairs
CREATE POLICY "Anyone can view active forex pairs" ON custom_forex_pairs
  FOR SELECT USING (is_active = true);

-- Only admin can manage forex pairs (using email check to avoid recursion)
CREATE POLICY "Only admin can insert forex" ON custom_forex_pairs
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@skytrading.com', 'komon502@gmail.com', 'dewstp128@gmail.com')
  );

CREATE POLICY "Only admin can update forex" ON custom_forex_pairs
  FOR UPDATE USING (
    auth.jwt() ->> 'email' IN ('admin@skytrading.com', 'komon502@gmail.com', 'dewstp128@gmail.com')
  );

CREATE POLICY "Only admin can delete forex" ON custom_forex_pairs
  FOR DELETE USING (
    auth.jwt() ->> 'email' IN ('admin@skytrading.com', 'komon502@gmail.com', 'dewstp128@gmail.com')
  );

-- Users can view their own trades
CREATE POLICY "Users can view own trades" ON custom_forex_trades
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own trades
CREATE POLICY "Users can create own trades" ON custom_forex_trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update (close) their own open trades
CREATE POLICY "Users can update own trades" ON custom_forex_trades
  FOR UPDATE USING (auth.uid() = user_id);

-- Price history readable by all
CREATE POLICY "Anyone can view price history" ON custom_forex_price_history
  FOR SELECT USING (true);

-- Functions

-- Function to update forex price (simulated movement)
CREATE OR REPLACE FUNCTION update_custom_forex_price(forex_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  current_pr DECIMAL(20, 8);
  volatility DECIMAL(5, 4);
  new_price DECIMAL(20, 8);
  random_factor DECIMAL(10, 8);
BEGIN
  SELECT current_price, price_volatility INTO current_pr, volatility
  FROM custom_forex_pairs WHERE id = forex_uuid;
  
  -- Generate random movement (-1 to +1) * volatility
  random_factor := (random() * 2 - 1) * volatility;
  new_price := current_pr * (1 + random_factor);
  
  -- Update price
  UPDATE custom_forex_pairs 
  SET current_price = new_price, updated_at = NOW()
  WHERE id = forex_uuid;
  
  -- Record history
  INSERT INTO custom_forex_price_history (forex_id, price)
  VALUES (forex_uuid, new_price);
  
  RETURN new_price;
END;
$$ LANGUAGE plpgsql;

-- Function to check if custom forex market is open
CREATE OR REPLACE FUNCTION is_custom_forex_open(forex_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  forex_record RECORD;
  now_time TIME;
  current_day INTEGER;
BEGIN
  SELECT * INTO forex_record FROM custom_forex_pairs WHERE id = forex_uuid;
  
  IF NOT forex_record.is_active THEN
    RETURN false;
  END IF;
  
  now_time := CURRENT_TIME;
  current_day := EXTRACT(ISODOW FROM CURRENT_DATE); -- 1=Mon, 7=Sun
  
  -- Check if today is trading day
  IF NOT (current_day = ANY(forex_record.trading_days)) THEN
    RETURN false;
  END IF;
  
  -- Check if within trading hours
  IF now_time < forex_record.market_open_time OR now_time > forex_record.market_close_time THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to close trade with win rate influence
CREATE OR REPLACE FUNCTION close_custom_forex_trade(
  trade_id UUID,
  close_price DECIMAL(20, 8)
)
RETURNS TABLE(profit_loss DECIMAL(20, 2), profit_loss_percent DECIMAL(10, 4)) AS $$
DECLARE
  trade_record RECORD;
  forex_record RECORD;
  pl DECIMAL(20, 2);
  pl_pct DECIMAL(10, 4);
  final_price DECIMAL(20, 8);
  win_rate_roll DECIMAL(5, 4);
BEGIN
  SELECT * INTO trade_record FROM custom_forex_trades WHERE id = trade_id;
  SELECT * INTO forex_record FROM custom_forex_pairs WHERE id = trade_record.forex_id;
  
  -- Win rate influence: roll random number, if less than win rate, player wins
  -- For buy: if current > entry, player wins naturally
  -- For sell: if current < entry, player wins naturally
  -- Admin win rate can flip unfavorable outcomes
  
  IF trade_record.type = 'buy' THEN
    -- Natural outcome
    IF close_price > trade_record.entry_price THEN
      -- Player would win naturally
      final_price := close_price;
    ELSE
      -- Player would lose - apply win rate
      win_rate_roll := random();
      IF win_rate_roll < forex_record.player_win_rate THEN
        -- Force win - adjust price slightly above entry
        final_price := trade_record.entry_price * 1.001;
      ELSE
        final_price := close_price;
      END IF;
    END IF;
  ELSE -- sell
    IF close_price < trade_record.entry_price THEN
      final_price := close_price;
    ELSE
      win_rate_roll := random();
      IF win_rate_roll < forex_record.player_win_rate THEN
        -- Force win - adjust price slightly below entry
        final_price := trade_record.entry_price * 0.999;
      ELSE
        final_price := close_price;
      END IF;
    END IF;
  END IF;
  
  -- Calculate P&L
  IF trade_record.type = 'buy' THEN
    pl := (final_price - trade_record.entry_price) * trade_record.quantity;
  ELSE
    pl := (trade_record.entry_price - final_price) * trade_record.quantity;
  END IF;
  
  pl_pct := (pl / (trade_record.entry_price * trade_record.quantity)) * 100;
  
  -- Update trade
  UPDATE custom_forex_trades
  SET exit_price = final_price,
      status = 'closed',
      profit_loss = pl,
      profit_loss_percent = pl_pct,
      closed_at = NOW()
  WHERE id = trade_id;
  
  RETURN QUERY SELECT pl, pl_pct;
END;
$$ LANGUAGE plpgsql;

-- Insert sample forex pairs (for testing)
INSERT INTO custom_forex_pairs (symbol, name, description, base_price, current_price, player_win_rate, created_by)
VALUES 
  ('THBUSD', 'Thai Baht / US Dollar', 'Custom THB/USD pair', 35.50, 35.50, 0.55, NULL),
  ('JPYTHB', 'Japanese Yen / Thai Baht', 'Custom JPY/THB pair', 0.23, 0.23, 0.50, NULL)
ON CONFLICT (symbol) DO NOTHING;
