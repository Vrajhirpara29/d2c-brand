import os
import sys
from datetime import datetime, date, timedelta
import random

# Add app directory to path to import database modules
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.database import init_db, get_db, Asset, COTRecord, NewsFeedItem, CopierAccount, CopiedTrade, CopierLog
from app.news import analyze_headline, MOCK_HEADLINES

# Target assets list
TARGET_ASSETS = [
    # Forex
    {"code": "EURUSD", "name": "EUR/USD", "type": "FOREX", "start_price": 1.0820, "price_step": 0.0010, "start_long": 190000, "start_short": 110000},
    {"code": "GBPUSD", "name": "GBP/USD", "type": "FOREX", "start_price": 1.2650, "price_step": 0.0012, "start_long": 85000, "start_short": 60000},
    {"code": "USDJPY", "name": "USD/JPY", "type": "FOREX", "start_price": 145.50, "price_step": 0.15, "start_long": 45000, "start_short": 125000}, # JPY net short = USDJPY bullish
    {"code": "AUDUSD", "name": "AUD/USD", "type": "FOREX", "start_price": 0.6620, "price_step": 0.0008, "start_long": 40000, "start_short": 75000},
    {"code": "USDCAD", "name": "USD/CAD", "type": "FOREX", "start_price": 1.3480, "price_step": 0.0009, "start_long": 35000, "start_short": 55000},
    {"code": "USDCHF", "name": "USD/CHF", "type": "FOREX", "start_price": 0.8850, "price_step": 0.0007, "start_long": 20000, "start_short": 40000},
    # Commodities
    {"code": "GOLD", "name": "Gold", "type": "COMMODITY", "start_price": 2030.0, "price_step": 6.5, "start_long": 160000, "start_short": 45000},
    {"code": "SILVER", "name": "Silver", "type": "COMMODITY", "start_price": 22.80, "price_step": 0.12, "start_long": 50000, "start_short": 22000},
    {"code": "WTI", "name": "WTI Crude Oil", "type": "COMMODITY", "start_price": 72.50, "price_step": 0.40, "start_long": 240000, "start_short": 95000},
    {"code": "BRENT", "name": "Brent Crude Oil", "type": "COMMODITY", "start_price": 77.20, "price_step": 0.42, "start_long": 220000, "start_short": 85000},
    {"code": "NATURAL_GAS", "name": "Natural Gas", "type": "COMMODITY", "start_price": 2.50, "price_step": 0.03, "start_long": 110000, "start_short": 135000},
    {"code": "COPPER", "name": "Copper", "type": "COMMODITY", "start_price": 3.85, "price_step": 0.015, "start_long": 65000, "start_short": 48000}
]

# Mock historical lists removed - utilizing app.news.MOCK_HEADLINES directly

def seed_database():
    print("Initializing database...")
    init_db()
    
    db = next(get_db())
    
    # 1. Seed Assets
    print("Seeding assets...")
    db.query(Asset).delete()
    for item in TARGET_ASSETS:
        db.add(Asset(
            code=item["code"],
            name=item["name"],
            type=item["type"]
        ))
    db.commit()
    
    # 2. Seed Weekly COT Records (Last 75 weeks, Friday by Friday)
    print("Seeding weekly COT records and prices...")
    db.query(COTRecord).delete()
    
    # End date is today, start date is 75 weeks ago
    end_date = date.today()
    # Go back to a Friday
    while end_date.weekday() != 4:
        end_date -= timedelta(days=1)
        
    start_date = end_date - timedelta(weeks=75)
    
    for item in TARGET_ASSETS:
        asset_code = item["code"]
        current_price = item["start_price"]
        long_contracts = item["start_long"]
        short_contracts = item["start_short"]
        
        # We will simulate a random walk that correlates position shifts with price changes
        # Long bias / short bias defines general trend direction
        trend_direction = random.choice([-1, 1])
        
        current_date = start_date
        week = 0
        
        while current_date <= end_date:
            # Change trends occasionally
            if week % 25 == 0 and week > 0:
                trend_direction = -trend_direction
                
            # Random position change
            long_change = int(random.normalvariate(trend_direction * 2500, 4000))
            short_change = int(random.normalvariate(-trend_direction * 1500, 3000))
            
            long_contracts = max(10000, long_contracts + long_change)
            short_contracts = max(10000, short_contracts + short_change)
            
            # Net Position = Long - Short
            net_position = long_contracts - short_contracts
            
            # Price tracks net position changes
            # Net positioning correlation: more net longs -> price goes up
            # For USDJPY, net contracts represent JPY, so JPY longs up -> USDJPY down
            corr_factor = -1.0 if asset_code == "USDJPY" else 1.0
            
            position_delta_ratio = (long_change - short_change) / (long_contracts + short_contracts)
            price_change = current_price * position_delta_ratio * 0.4 * corr_factor
            # Add some random noise
            price_noise = current_price * random.uniform(-0.015, 0.015)
            
            current_price = max(0.01, current_price + price_change + price_noise)
            
            # Formatting precision based on asset type
            if item["type"] == "FOREX":
                if "JPY" in asset_code:
                    current_price = round(current_price, 2)
                else:
                    current_price = round(current_price, 4)
            else:
                if asset_code in ["GOLD", "WTI", "BRENT"]:
                    current_price = round(current_price, 2)
                elif asset_code == "SILVER":
                    current_price = round(current_price, 2)
                else:
                    current_price = round(current_price, 3)
                    
            db.add(COTRecord(
                asset_code=asset_code,
                date=current_date,
                long_contracts=long_contracts,
                short_contracts=short_contracts,
                net_position=net_position,
                asset_price=current_price
            ))
            
            current_date += timedelta(weeks=1)
            week += 1
            
    db.commit()
    
    # 3. Seed News Feed
    print("Seeding news feed...")
    db.query(NewsFeedItem).delete()
    
    # Generate 45 news feed items distributed over the last 3 days
    base_time = datetime.utcnow()
    sources = [
        "Bloomberg Terminal",
        "Reuters Eikon",
        "ForexFactory Feed",
        "Twitter / @ZeroHedge",
        "Twitter / @LiveSquawk",
        "Financial Times"
    ]
    
    for i in range(45):
        headline_data = random.choice(MOCK_HEADLINES)
        headline, trigger, custom_summary = headline_data
        # Shift times slightly
        timestamp = base_time - timedelta(hours=i * 2 + random.randint(0, 45))
        
        impact = analyze_headline(headline)
        
        # Select high-frequency news channel prefixes
        prefix = random.choice([
            "Bloomberg Terminal [BBG]",
            "ForexFactory News Alert",
            "X / Twitter @ZeroHedge Feed",
            "Reuters Eikon squawk line"
        ])
        
        db.add(NewsFeedItem(
            timestamp=timestamp,
            headline=f"[{prefix}] {headline}",
            summary=custom_summary,
            source=random.choice(sources),
            asset_tags=impact["asset_tags"],
            impact_direction=impact["impact_direction"],
            volatility_4h=impact["volatility_4h"],
            volatility_24h=impact["volatility_24h"],
            confidence_score=impact["confidence_score"],
            impact_severity=impact["impact_severity"]
        ))
        
    db.commit()

    # 4. Seed Copy Trading Data
    print("Seeding Copy Trading database...")
    db.query(CopierAccount).delete()
    db.query(CopiedTrade).delete()
    db.query(CopierLog).delete()
    
    # Accounts
    accounts = [
        CopierAccount(account_number=892015, name="Aggressive Alpha HFT", broker="IC Markets", type="PROVIDER", equity=85241.50, balance=85000.00, status="CONNECTED"),
        CopierAccount(account_number=509214, name="Follower Retail-01", broker="Pepperstone", type="FOLLOWER", equity=12410.80, balance=12300.00, status="SYNCING"),
        CopierAccount(account_number=304891, name="Follower High-Net-Worth", broker="Vantage FX", type="FOLLOWER", equity=450215.10, balance=450000.00, status="CONNECTED"),
        CopierAccount(account_number=709142, name="Follower Risk-Controlled", broker="FP Markets", type="FOLLOWER", equity=5124.90, balance=5100.00, status="CONNECTED")
    ]
    for acc in accounts:
        db.add(acc)
    db.commit()
    
    # Historical Copied Trades (Closed)
    historical_trades = [
        CopiedTrade(ticket=4092104, symbol="EURUSD", type="BUY", volume=1.00, open_price=1.08241, close_price=1.08385, profit=144.00, execution_delay_ms=28, status="CLOSED", timestamp=datetime.utcnow() - timedelta(hours=5)),
        CopiedTrade(ticket=4092110, symbol="GBPUSD", type="SELL", volume=0.50, open_price=1.26425, close_price=1.26310, profit=57.50, execution_delay_ms=42, status="CLOSED", timestamp=datetime.utcnow() - timedelta(hours=3)),
        CopiedTrade(ticket=4092115, symbol="GOLD", type="BUY", volume=0.20, open_price=2152.40, close_price=2148.80, profit=-72.00, execution_delay_ms=19, status="CLOSED", timestamp=datetime.utcnow() - timedelta(hours=2)),
        CopiedTrade(ticket=4092120, symbol="WTI", type="BUY", volume=1.00, open_price=78.20, close_price=78.65, profit=450.00, execution_delay_ms=56, status="CLOSED", timestamp=datetime.utcnow() - timedelta(hours=1))
    ]
    for trd in historical_trades:
        db.add(trd)
        
    # Open Copied Trades
    open_trades = [
        CopiedTrade(ticket=4092131, symbol="EURUSD", type="BUY", volume=1.00, open_price=1.08412, close_price=None, profit=13.00, execution_delay_ms=24, status="OPEN", timestamp=datetime.utcnow() - timedelta(minutes=15))
    ]
    for trd in open_trades:
        db.add(trd)
    db.commit()
    
    # Logs
    logs = [
        CopierLog(timestamp=datetime.utcnow() - timedelta(minutes=45), message="MetaTrader Copier Terminal initialized successfully.", level="INFO"),
        CopierLog(timestamp=datetime.utcnow() - timedelta(minutes=40), message="Provider Account [892015] Aggressive Alpha HFT connected on IC Markets.", level="SUCCESS"),
        CopierLog(timestamp=datetime.utcnow() - timedelta(minutes=35), message="Follower Account [304891] High-Net-Worth linked. Syncing allocations...", level="INFO"),
        CopierLog(timestamp=datetime.utcnow() - timedelta(minutes=34), message="Follower Account [304891] synced successfully. Standing by.", level="SUCCESS"),
        CopierLog(timestamp=datetime.utcnow() - timedelta(minutes=30), message="Follower Account [709142] Risk-Controlled linked and connected.", level="SUCCESS"),
        CopierLog(timestamp=datetime.utcnow() - timedelta(minutes=15), message="Provider executed Market BUY 1.00 EURUSD. Replicating order on Followers...", level="INFO"),
        CopierLog(timestamp=datetime.utcnow() - timedelta(minutes=15), message="Replicated BUY 1.00 EURUSD on follower [304891] in 24ms. Slippage: 0.1 pips.", level="SUCCESS"),
        CopierLog(timestamp=datetime.utcnow() - timedelta(minutes=15), message="Replicated BUY 1.00 EURUSD on follower [709142] in 32ms. Slippage: 0.2 pips.", level="SUCCESS")
    ]
    for lg in logs:
        db.add(lg)
    db.commit()

    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
