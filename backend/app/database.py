import os
from datetime import datetime, date
from sqlalchemy import create_engine, Column, Integer, String, Float, Date, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

# Database file location
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///../cot_dashboard.db")
if not DATABASE_URL.startswith("sqlite"):
    # For cloud deployments, use a local SQLite in the current directory
    DATABASE_URL = "sqlite:///./cot_dashboard.db"

# Create the engine
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}  # Necessary for SQLite and FastAPI concurrent threads
)

# Session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)

Base = declarative_base()

# Models
class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., 'EURUSD', 'GOLD'
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # 'FOREX' or 'COMMODITY'

class COTRecord(Base):
    __tablename__ = "cot_records"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String(50), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)  # Date of reporting (usually Friday)
    long_contracts = Column(Integer, nullable=False)
    short_contracts = Column(Integer, nullable=False)
    net_position = Column(Integer, nullable=False)  # long_contracts - short_contracts
    asset_price = Column(Float, nullable=False)

class NewsPrecedent(Base):
    __tablename__ = "news_precedents"
    
    id = Column(Integer, primary_key=True, index=True)
    keyword_trigger = Column(String(100), unique=True, index=True, nullable=False)  # e.g., 'fed_rate_hike'
    description = Column(String(255), nullable=False)
    probable_direction = Column(String(50), nullable=False)  # 'Bullish', 'Bearish', 'Neutral'
    volatility_4h_low = Column(Float, nullable=False)  # percentage lower bound
    volatility_4h_high = Column(Float, nullable=False)  # percentage upper bound
    volatility_24h_low = Column(Float, nullable=False)
    volatility_24h_high = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)  # 0.0 to 1.0 (e.g. 0.85 for 85%)

class NewsFeedItem(Base):
    __tablename__ = "news_feed_items"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    headline = Column(String(500), nullable=False)
    summary = Column(Text, nullable=True)
    source = Column(String(100), nullable=False)
    asset_tags = Column(String(255), nullable=False)  # comma separated list, e.g., '#EURUSD,#Gold'
    impact_direction = Column(String(50), nullable=False)  # 'Bullish', 'Bearish', 'Neutral'
    volatility_4h = Column(String(50), nullable=False)  # e.g., "0.15% - 0.45%"
    volatility_24h = Column(String(50), nullable=False)  # e.g., "0.40% - 1.20%"
    confidence_score = Column(Float, nullable=False)  # e.g., 0.82
    impact_severity = Column(String(50), nullable=True) # e.g., "High", "Medium", "Low"

class CopierAccount(Base):
    __tablename__ = "copier_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    broker = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # 'PROVIDER' or 'FOLLOWER'
    equity = Column(Float, nullable=False)
    balance = Column(Float, nullable=False)
    status = Column(String(50), nullable=False)  # 'CONNECTED', 'SYNCING', 'DISCONNECTED'

class CopiedTrade(Base):
    __tablename__ = "copied_trades"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket = Column(Integer, index=True, nullable=False)
    symbol = Column(String(50), nullable=False)
    type = Column(String(50), nullable=False)  # 'BUY' or 'SELL'
    volume = Column(Float, nullable=False)
    open_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=True)
    profit = Column(Float, nullable=True)
    execution_delay_ms = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False)  # 'OPEN' or 'CLOSED'
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class CopierLog(Base):
    __tablename__ = "copier_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    message = Column(String(500), nullable=False)
    level = Column(String(50), nullable=False)  # 'INFO', 'WARNING', 'SUCCESS'

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
