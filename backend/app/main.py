import os
import asyncio
import random
from datetime import datetime, date
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import init_db, get_db, Asset, COTRecord, NewsPrecedent, NewsFeedItem, CopierAccount, CopiedTrade, CopierLog
from app.news import analyze_headline, generate_live_news_item, PRECEDENTS

app = FastAPI(title="Global Macro Edge - COT Institutional Flow Dashboard")

# Enable CORS for Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COPIER_SETTINGS = {
    "lot_multiplier": 1.0,
    "max_slippage": 3.0,
    "copy_sl_tp": True,
    "is_active": True
}

async def copier_simulation_loop():
    while True:
        await asyncio.sleep(12)  # run simulation step every 12 seconds
        
        if not COPIER_SETTINGS["is_active"]:
            continue
            
        try:
            # We need a db session
            db = next(get_db())
            
            # Check for open trades
            open_trades = db.query(CopiedTrade).filter(CopiedTrade.status == "OPEN").all()
            
            if open_trades:
                # Close one of the open trades randomly
                trade_to_close = random.choice(open_trades)
                
                # Get current pricing for profit calculation
                # Let's say profit is a random walk between -$100 and +$300
                profit = round(random.uniform(-100, 300), 2)
                
                trade_to_close.close_price = round(trade_to_close.open_price * (1 + (profit / 10000)), 5)
                trade_to_close.profit = profit
                trade_to_close.status = "CLOSED"
                
                # Update account balances
                provider = db.query(CopierAccount).filter(CopierAccount.type == "PROVIDER").first()
                if provider:
                    provider.balance += profit * 1.5
                    provider.equity = provider.balance
                    
                followers = db.query(CopierAccount).filter(CopierAccount.type == "FOLLOWER").all()
                for fol in followers:
                    fol.balance += profit * COPIER_SETTINGS["lot_multiplier"] * random.uniform(0.95, 1.05)
                    fol.equity = fol.balance
                    fol.status = "CONNECTED" # make sure they stay connected
                
                # Add log
                close_log = CopierLog(
                    message=f"Provider CLOSED trade #{trade_to_close.ticket} on {trade_to_close.symbol}. Replicated close on Followers. Net Profit: ${profit:+.2f}",
                    level="SUCCESS" if profit >= 0 else "WARNING"
                )
                db.add(close_log)
                db.commit()
                
            else:
                # Open a new trade
                symbols = ["EURUSD", "GBPUSD", "GOLD", "WTI", "USDJPY"]
                symbol = random.choice(symbols)
                trade_type = random.choice(["BUY", "SELL"])
                
                # Get approximate current price
                base_prices = {"EURUSD": 1.0842, "GBPUSD": 1.2631, "GOLD": 2154.30, "WTI": 78.15, "USDJPY": 156.80}
                open_price = base_prices[symbol]
                
                ticket = random.randint(4092140, 4099999)
                volume = round(random.choice([0.10, 0.50, 1.00, 2.00]), 2)
                delay = random.randint(12, 65) # ms
                
                new_trade = CopiedTrade(
                    ticket=ticket,
                    symbol=symbol,
                    type=trade_type,
                    volume=volume,
                    open_price=open_price,
                    execution_delay_ms=delay,
                    status="OPEN",
                    timestamp=datetime.utcnow()
                )
                db.add(new_trade)
                
                # Add log
                open_log = CopierLog(
                    message=f"Provider opened {trade_type} {volume} {symbol} at {open_price}. Replicating to Followers...",
                    level="INFO"
                )
                db.add(open_log)
                db.commit()
                
                # Simulate copying delay logs
                await asyncio.sleep(0.1) # tiny sleep to separate logs
                
                followers = db.query(CopierAccount).filter(CopierAccount.type == "FOLLOWER").all()
                for fol in followers:
                    fol_delay = delay + random.randint(2, 18)
                    slippage = round(random.uniform(0.0, 0.3), 1)
                    db.add(CopierLog(
                        message=f"Replicated {trade_type} {volume * COPIER_SETTINGS['lot_multiplier']:.2f} {symbol} on follower [{fol.account_number}] in {fol_delay}ms. Slippage: {slippage} pips.",
                        level="SUCCESS"
                    ))
                db.commit()
                
            db.close()
            
        except Exception as e:
            print("Error in copier background task:", e)

# Startup event to initialize DB and seed precedents
@app.on_event("startup")
def startup_event():
    # Start the copier background simulation task
    asyncio.create_task(copier_simulation_loop())
    
    # Initialize DB tables
    init_db()
    
    # Seed News Precedents if empty
    db = next(get_db())
    if db.query(NewsPrecedent).count() == 0:
        for prec in PRECEDENTS:
            # Reformat keywords list to comma-separated string for simplicity
            keywords_str = ",".join(prec["keywords"])
            # Get typical USD impact for description if needed
            first_asset = list(prec["impacts"].keys())[0]
            dir_val, conf, v4l, v4h, v24l, v24h = prec["impacts"][first_asset]
            
            db.add(NewsPrecedent(
                keyword_trigger=prec["trigger"],
                description=prec["description"],
                probable_direction=dir_val,
                volatility_4h_low=v4l,
                volatility_4h_high=v4h,
                volatility_24h_low=v24l,
                volatility_24h_high=v24h,
                confidence=conf
            ))
        db.commit()
    db.close()

# Pydantic schemas for documentation & serialization
class AssetSchema(BaseModel):
    code: str
    name: str
    type: str

    class Config:
        from_attributes = True

class COTRecordSchema(BaseModel):
    asset_code: str
    date: date
    long_contracts: int
    short_contracts: int
    net_position: int
    asset_price: float

    class Config:
        from_attributes = True

class NewsFeedItemSchema(BaseModel):
    id: int
    timestamp: datetime
    headline: str
    summary: Optional[str]
    source: str
    asset_tags: str
    impact_direction: str
    volatility_4h: str
    volatility_24h: str
    confidence_score: float
    impact_severity: Optional[str]

    class Config:
        from_attributes = True

class HeadlineRequest(BaseModel):
    headline: str

class HeadlineAnalysisResponse(BaseModel):
    headline: str
    asset_tags: str
    impact_direction: str
    volatility_4h: str
    volatility_24h: str
    confidence_score: float
    impact_severity: str

class CopierAccountSchema(BaseModel):
    account_number: int
    name: str
    broker: str
    type: str
    equity: float
    balance: float
    status: str

    class Config:
        from_attributes = True

class CopiedTradeSchema(BaseModel):
    id: int
    ticket: int
    symbol: str
    type: str
    volume: float
    open_price: float
    close_price: Optional[float] = None
    profit: Optional[float] = None
    execution_delay_ms: int
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True

class CopierLogSchema(BaseModel):
    id: int
    timestamp: datetime
    message: str
    level: str

    class Config:
        from_attributes = True

class CopierSettingsUpdate(BaseModel):
    lot_multiplier: float
    max_slippage: float
    copy_sl_tp: bool
    is_active: bool

# Routes
@app.get("/")
def read_root():
    return {"message": "Global Macro Edge API is online"}

@app.get("/api/assets", response_model=List[AssetSchema])
def get_assets(db: Session = Depends(get_db)):
    assets = db.query(Asset).all()
    # If empty, return a static list of default assets
    if not assets:
        return [
            {"code": "EURUSD", "name": "EUR/USD", "type": "FOREX"},
            {"code": "GBPUSD", "name": "GBP/USD", "type": "FOREX"},
            {"code": "USDJPY", "name": "USD/JPY", "type": "FOREX"},
            {"code": "AUDUSD", "name": "AUD/USD", "type": "FOREX"},
            {"code": "USDCAD", "name": "USD/CAD", "type": "FOREX"},
            {"code": "USDCHF", "name": "USD/CHF", "type": "FOREX"},
            {"code": "GOLD", "name": "Gold (Precious Metal)", "type": "COMMODITY"},
            {"code": "SILVER", "name": "Silver (Precious Metal)", "type": "COMMODITY"},
            {"code": "WTI", "name": "WTI Crude Oil (Energy)", "type": "COMMODITY"},
            {"code": "BRENT", "name": "Brent Crude Oil (Energy)", "type": "COMMODITY"},
            {"code": "NATURAL_GAS", "name": "Natural Gas (Energy)", "type": "COMMODITY"},
            {"code": "COPPER", "name": "Copper (Industrial Metal)", "type": "COMMODITY"}
        ]
    return assets

@app.get("/api/cot/{asset_code}", response_model=List[COTRecordSchema])
def get_cot_data(asset_code: str, db: Session = Depends(get_db)):
    records = db.query(COTRecord).filter(
        COTRecord.asset_code == asset_code
    ).order_by(COTRecord.date.asc()).all()
    return records

@app.get("/api/news", response_model=List[NewsFeedItemSchema])
def get_news_feed(limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    items = db.query(NewsFeedItem).filter(
        NewsFeedItem.impact_direction != "Neutral"
    ).order_by(NewsFeedItem.timestamp.desc()).limit(limit).all()
    return items

@app.post("/api/news/generate", response_model=NewsFeedItemSchema)
def generate_news(db: Session = Depends(get_db)):
    """Triggers generation of a new random news feed item and stores it in the database."""
    item_data = generate_live_news_item()
    feed_item = NewsFeedItem(
        timestamp=item_data["timestamp"],
        headline=item_data["headline"],
        summary=item_data["summary"],
        source=item_data["source"],
        asset_tags=item_data["asset_tags"],
        impact_direction=item_data["impact_direction"],
        volatility_4h=item_data["volatility_4h"],
        volatility_24h=item_data["volatility_24h"],
        confidence_score=item_data["confidence_score"],
        impact_severity=item_data["impact_severity"]
    )
    db.add(feed_item)
    db.commit()
    db.refresh(feed_item)
    return feed_item

@app.post("/api/news/impact-check", response_model=HeadlineAnalysisResponse)
def check_headline_impact(payload: HeadlineRequest):
    """Ad-hoc endpoint to verify the semantic news impact engine against a custom headline."""
    analysis = analyze_headline(payload.headline)
    return {
        "headline": payload.headline,
        **analysis
    }

@app.get("/api/copier/accounts", response_model=List[CopierAccountSchema])
def get_copier_accounts(db: Session = Depends(get_db)):
    return db.query(CopierAccount).all()

@app.get("/api/copier/trades", response_model=List[CopiedTradeSchema])
def get_copied_trades(limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    return db.query(CopiedTrade).order_by(CopiedTrade.timestamp.desc()).limit(limit).all()

@app.get("/api/copier/logs", response_model=List[CopierLogSchema])
def get_copier_logs(limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    return db.query(CopierLog).order_by(CopierLog.timestamp.desc()).limit(limit).all()

@app.get("/api/copier/settings")
def get_copier_settings():
    return COPIER_SETTINGS

@app.post("/api/copier/settings")
def update_copier_settings(settings: CopierSettingsUpdate):
    COPIER_SETTINGS["lot_multiplier"] = settings.lot_multiplier
    COPIER_SETTINGS["max_slippage"] = settings.max_slippage
    COPIER_SETTINGS["copy_sl_tp"] = settings.copy_sl_tp
    COPIER_SETTINGS["is_active"] = settings.is_active
    return COPIER_SETTINGS

@app.get("/api/copier/stats")
def get_copier_stats(db: Session = Depends(get_db)):
    trades = db.query(CopiedTrade).filter(CopiedTrade.status == "CLOSED").all()
    total_trades = len(trades)
    
    if total_trades == 0:
        return {
            "avg_delay": 32,
            "success_rate": 99.98,
            "total_profit": 580.40,
            "daily_gain": 1.15,
            "drawdown": 2.41
        }
        
    avg_delay = int(sum(t.execution_delay_ms for t in trades) / total_trades)
    total_profit = round(sum(t.profit for t in trades), 2)
    daily_gain = round(1.15 + (total_profit / 5000), 2)
    
    return {
        "avg_delay": avg_delay,
        "success_rate": 99.98,
        "total_profit": total_profit,
        "daily_gain": daily_gain,
        "drawdown": 2.41
    }

@app.post("/api/copier/simulate-trade")
def force_simulate_trade(db: Session = Depends(get_db)):
    """Triggers an immediate simulated trade execution."""
    symbols = ["EURUSD", "GBPUSD", "GOLD", "WTI", "USDJPY"]
    symbol = random.choice(symbols)
    trade_type = random.choice(["BUY", "SELL"])
    
    base_prices = {"EURUSD": 1.0842, "GBPUSD": 1.2631, "GOLD": 2154.30, "WTI": 78.15, "USDJPY": 156.80}
    open_price = base_prices[symbol]
    
    ticket = random.randint(4092140, 4099999)
    volume = round(random.choice([0.10, 0.50, 1.00, 2.00]), 2)
    delay = random.randint(12, 65) # ms
    
    new_trade = CopiedTrade(
        ticket=ticket,
        symbol=symbol,
        type=trade_type,
        volume=volume,
        open_price=open_price,
        execution_delay_ms=delay,
        status="OPEN",
        timestamp=datetime.utcnow()
    )
    db.add(new_trade)
    
    db.add(CopierLog(
        message=f"Provider opened {trade_type} {volume} {symbol} at {open_price} (MANUAL FORCE).",
        level="INFO"
    ))
    db.commit()
    
    followers = db.query(CopierAccount).filter(CopierAccount.type == "FOLLOWER").all()
    for fol in followers:
        fol_delay = delay + random.randint(2, 18)
        slippage = round(random.uniform(0.0, 0.3), 1)
        db.add(CopierLog(
            message=f"Replicated {trade_type} {volume * COPIER_SETTINGS['lot_multiplier']:.2f} {symbol} on follower [{fol.account_number}] in {fol_delay}ms. Slippage: {slippage} pips.",
            level="SUCCESS"
        ))
    db.commit()
    
    return {"message": "Trade simulation forced successfully", "ticket": ticket}
