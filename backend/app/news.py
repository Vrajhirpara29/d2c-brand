import re
from datetime import datetime
import random

# Predefined Precedent rules with keywords and reactions per asset class
PRECEDENTS = [
    {
        "trigger": "hawkish_fed",
        "description": "Hawkish Federal Reserve (Rate Hike / Tightening)",
        "keywords": [r"\bfed\b", r"\bfederal reserve\b", r"\bpowell\b", r"\bhawkish\b", r"\brate hike\b", r"\btightening\b", r"\bhike rates\b"],
        "min_matches": 2, # Requires at least 2 keywords if simple, or 1 strong keyword
        "impacts": {
            "USD": ("Bullish", 0.85, 0.20, 0.55, 0.50, 1.30),  # (direction, confidence, 4h_low, 4h_high, 24h_low, 24h_high)
            "GOLD": ("Bearish", 0.88, 0.40, 1.10, 0.90, 2.50),
            "EURUSD": ("Bearish", 0.82, 0.25, 0.65, 0.60, 1.60),
            "GBPUSD": ("Bearish", 0.80, 0.25, 0.70, 0.60, 1.70),
            "USDJPY": ("Bullish", 0.85, 0.30, 0.80, 0.70, 1.90),
            "AUDUSD": ("Bearish", 0.84, 0.35, 0.90, 0.80, 2.10)
        }
    },
    {
        "trigger": "dovish_fed",
        "description": "Dovish Federal Reserve (Rate Cut / Easing)",
        "keywords": [r"\bfed\b", r"\bfederal reserve\b", r"\bpowell\b", r"\bdovish\b", r"\brate cut\b", r"\beasing\b", r"\bcut rates\b"],
        "min_matches": 2,
        "impacts": {
            "USD": ("Bearish", 0.84, 0.20, 0.50, 0.50, 1.20),
            "GOLD": ("Bullish", 0.90, 0.50, 1.30, 1.10, 3.00),
            "EURUSD": ("Bullish", 0.83, 0.25, 0.60, 0.60, 1.50),
            "GBPUSD": ("Bullish", 0.82, 0.25, 0.65, 0.60, 1.60),
            "USDJPY": ("Bearish", 0.84, 0.30, 0.75, 0.70, 1.80),
            "AUDUSD": ("Bullish", 0.83, 0.35, 0.85, 0.80, 2.00)
        }
    },
    {
        "trigger": "opec_cut",
        "description": "OPEC+ Supply Cut Announcement",
        "keywords": [r"\bopec\b", r"\bopec\+\b", r"\bsupply cut\b", r"\bcut production\b", r"\bsaudi\b", r"\bcrude production\b"],
        "min_matches": 1,
        "impacts": {
            "WTI": ("Bullish", 0.92, 1.00, 2.50, 2.20, 5.50),
            "BRENT": ("Bullish", 0.93, 0.95, 2.40, 2.10, 5.30),
            "USDCAD": ("Bearish", 0.80, 0.25, 0.60, 0.50, 1.40)  # CAD goes up, so USD/CAD drops
        }
    },
    {
        "trigger": "opec_increase",
        "description": "OPEC+ Production Increase / Price War",
        "keywords": [r"\bopec\b", r"\bopec\+\b", r"\bproduction hike\b", r"\bsupply increase\b", r"\bboost supply\b"],
        "min_matches": 1,
        "impacts": {
            "WTI": ("Bearish", 0.89, 1.10, 2.80, 2.40, 6.00),
            "BRENT": ("Bearish", 0.90, 1.00, 2.70, 2.30, 5.80),
            "USDCAD": ("Bullish", 0.78, 0.25, 0.65, 0.55, 1.50)
        }
    },
    {
        "trigger": "safe_haven",
        "description": "Geopolitical Safe-Haven Flight / Escalation",
        "keywords": [r"\bgeopolitical\b", r"\bwar\b", r"\bconflict\b", r"\bescalat\w+\b", r"\bsanction\b", r"\bmilitary\b", r"\bmiddle east\b", r"\btension\b"],
        "min_matches": 1,
        "impacts": {
            "GOLD": ("Bullish", 0.88, 0.60, 1.50, 1.20, 3.50),
            "USDJPY": ("Bearish", 0.78, 0.25, 0.70, 0.60, 1.60),  # JPY gets bought as safe haven, USD/JPY drops
            "USDCHF": ("Bearish", 0.76, 0.25, 0.65, 0.55, 1.50),  # CHF gets bought
            "EURUSD": ("Bearish", 0.75, 0.20, 0.55, 0.50, 1.30),
            "WTI": ("Bullish", 0.82, 0.80, 2.20, 1.80, 4.80)       # Oil up due to supply risks
        }
    },
    {
        "trigger": "cpi_beat",
        "description": "US CPI Inflation Beats Expectations",
        "keywords": [r"\bcpi\b", r"\binflation\b", r"\bconsumer price\b"],
        "strong_keywords": [r"\bbeats\b", r"\brise\b", r"\bhigher than expected\b", r"\bsurge\b", r"\bhotter\b"],
        "min_matches": 1,
        "impacts": {
            "USD": ("Bullish", 0.86, 0.20, 0.50, 0.45, 1.20),
            "GOLD": ("Bearish", 0.82, 0.35, 0.90, 0.80, 2.20),
            "EURUSD": ("Bearish", 0.84, 0.20, 0.55, 0.50, 1.30),
            "USDJPY": ("Bullish", 0.83, 0.25, 0.65, 0.60, 1.50)
        }
    },
    {
        "trigger": "cpi_miss",
        "description": "US CPI Inflation Misses Expectations",
        "keywords": [r"\bcpi\b", r"\binflation\b", r"\bconsumer price\b"],
        "strong_keywords": [r"\bmisses\b", r"\bdrop\b", r"\blower than expected\b", r"\bcool\w*\b", r"\bsoften\b"],
        "min_matches": 1,
        "impacts": {
            "USD": ("Bearish", 0.85, 0.20, 0.50, 0.45, 1.10),
            "GOLD": ("Bullish", 0.87, 0.40, 1.10, 0.90, 2.50),
            "EURUSD": ("Bullish", 0.85, 0.20, 0.55, 0.50, 1.30),
            "USDJPY": ("Bearish", 0.82, 0.25, 0.65, 0.60, 1.50)
        }
    },
    {
        "trigger": "nfp_beat",
        "description": "US Jobs Report (NFP) Exceeds Forecast",
        "keywords": [r"\bnfp\b", r"\bnon-farm payrolls\b", r"\bjobs report\b", r"\bemployment data\b"],
        "strong_keywords": [r"\bbeats\b", r"\bsurges\b", r"\bstrong\b", r"\bhigher than expected\b", r"\badd\w*\b\s+\d+k\b"],
        "min_matches": 1,
        "impacts": {
            "USD": ("Bullish", 0.84, 0.18, 0.45, 0.40, 1.10),
            "GOLD": ("Bearish", 0.85, 0.35, 1.00, 0.80, 2.30),
            "EURUSD": ("Bearish", 0.82, 0.20, 0.50, 0.50, 1.30),
            "USDJPY": ("Bullish", 0.84, 0.25, 0.65, 0.60, 1.60)
        }
    },
    {
        "trigger": "nfp_miss",
        "description": "US Jobs Report (NFP) Misses Forecast",
        "keywords": [r"\bnfp\b", r"\bnon-farm payrolls\b", r"\bjobs report\b", r"\bemployment data\b"],
        "strong_keywords": [r"\bmisses\b", r"\bweak\b", r"\blower than expected\b", r"\bslowdown\b"],
        "min_matches": 1,
        "impacts": {
            "USD": ("Bearish", 0.83, 0.18, 0.45, 0.40, 1.00),
            "GOLD": ("Bullish", 0.86, 0.40, 1.10, 0.90, 2.40),
            "EURUSD": ("Bullish", 0.84, 0.20, 0.55, 0.50, 1.30),
            "USDJPY": ("Bearish", 0.83, 0.25, 0.65, 0.60, 1.50)
        }
    }
]

# Simple Helper to detect asset mentions in the text
ASSET_KEYWORDS = {
    "EURUSD": [r"\beur\b", r"\beuro\b", r"\beurusd\b", r"\beur/usd\b"],
    "GBPUSD": [r"\bgbp\b", r"\bpound\b", r"\bgbpusd\b", r"\bgbp/usd\b"],
    "USDJPY": [r"\bjpy\b", r"\byen\b", r"\busdjpy\b", r"\busd/jpy\b"],
    "AUDUSD": [r"\baud\b", r"\baussie\b", r"\baudusd\b", r"\baud/usd\b"],
    "USDCAD": [r"\bcad\b", r"\bloonie\b", r"\busdcad\b", r"\busd/cad\b"],
    "USDCHF": [r"\bchf\b", r"\bfranc\b", r"\busdchf\b", r"\busd/chf\b"],
    "GOLD": [r"\bgold\b", r"\bxau\b", r"\bxauusd\b", r"\bgold/usd\b", r"\bprecious metals?\b"],
    "SILVER": [r"\bsilver\b", r"\bxag\b", r"\bxagusd\b"],
    "COPPER": [r"\bcopper\b", r"\bindustrial metals?\b"],
    "WTI": [r"\bwti\b", r"\bcrude\b", r"\boil\b", r"\bwest texas intermediate\b", r"\benergy\b"],
    "BRENT": [r"\bbrent\b", r"\bcrude\b", r"\boil\b", r"\benergy\b"],
    "NATURAL_GAS": [r"\bnat gas\b", r"\bnatural gas\b", r"\bgas price\b", r"\benergy\b"]
}

def analyze_headline(headline: str) -> dict:
    """
    Analyzes a headline against historical macro precedents.
    Returns:
        tags: comma-separated list of affected assets, e.g. '#Gold,#EURUSD'
        probable_direction: 'Bullish', 'Bearish', or 'Neutral'
        volatility_4h: String representation of volatility bounds, e.g., '0.20% - 0.50%'
        volatility_24h: String representation of volatility bounds, e.g., '0.50% - 1.20%'
        confidence: Precedent confidence score (float 0 to 1)
    """
    matched_precedent = None
    best_match_score = -1
    
    # Run simple regex keyword counting
    for prec in PRECEDENTS:
        # Check standard keywords
        base_matches = 0
        for kw in prec["keywords"]:
            if re.search(kw, headline, re.IGNORECASE):
                base_matches += 1
                
        # Check strong keywords if they exist
        strong_matches = 0
        if "strong_keywords" in prec:
            for kw in prec["strong_keywords"]:
                if re.search(kw, headline, re.IGNORECASE):
                    strong_matches += 1
                    
        # Define matching criteria
        is_match = False
        match_score = 0
        
        if prec["trigger"] in ["cpi_beat", "cpi_miss", "nfp_beat", "nfp_miss"]:
            # Needs at least one base NFP/CPI keyword and at least one strong indicator (beat/miss)
            if base_matches >= 1 and strong_matches >= 1:
                is_match = True
                match_score = base_matches + strong_matches * 2
        else:
            # Fallback to standard base keyword counting
            if base_matches >= prec["min_matches"]:
                is_match = True
                match_score = base_matches
                
        if is_match and match_score > best_match_score:
            best_match_score = match_score
            matched_precedent = prec

    # Determine which target assets are mentioned
    affected_assets = []
    for asset_code, patterns in ASSET_KEYWORDS.items():
        for pat in patterns:
            if re.search(pat, headline, re.IGNORECASE):
                affected_assets.append(asset_code)
                break
                
    # If a precedent matched, it dictates the primary reactions
    if matched_precedent:
        impacts = matched_precedent["impacts"]
        
        # If no specific assets were mentioned in the headline, use the primary asset associated with the precedent
        if not affected_assets:
            # Guess based on precedent's first impact key
            affected_assets = [list(impacts.keys())[0]]
            
        # Select the dominant impact details (average or first matched asset)
        # We will compute the average volatility and average confidence,
        # and choose the dominant direction.
        directions = []
        confidences = []
        vol4h_lows = []
        vol4h_highs = []
        vol24h_lows = []
        vol24h_highs = []
        
        for asset in affected_assets:
            # If asset is specifically mapped in the precedent impacts
            if asset in impacts:
                dir_val, conf, v4l, v4h, v24l, v24h = impacts[asset]
                directions.append(dir_val)
                confidences.append(conf)
                vol4h_lows.append(v4l)
                vol4h_highs.append(v4h)
                vol24h_lows.append(v24l)
                vol24h_highs.append(v24h)
            elif "USD" in impacts: # fallback to general USD effect
                dir_val, conf, v4l, v4h, v24l, v24h = impacts["USD"]
                # Invert direction if USD is bullish and asset is EURUSD, GBPUSD, etc.
                if asset in ["EURUSD", "GBPUSD", "AUDUSD", "GOLD", "SILVER", "COPPER"]:
                    dir_val = "Bearish" if dir_val == "Bullish" else "Bullish"
                directions.append(dir_val)
                confidences.append(conf * 0.9) # slightly less confident on unmapped
                vol4h_lows.append(v4l * 0.8)
                vol4h_highs.append(v4h * 0.8)
                vol24h_lows.append(v24l * 0.8)
                vol24h_highs.append(v24h * 0.8)
                
        if directions:
            # Take the mode direction or first one
            direction = directions[0]
            confidence = sum(confidences) / len(confidences)
            v4_l = sum(vol4h_lows) / len(vol4h_lows)
            v4_h = sum(vol4h_highs) / len(vol4h_highs)
            v24_l = sum(vol24h_lows) / len(vol24h_lows)
            v24_h = sum(vol24h_highs) / len(vol24h_highs)
        else:
            # Fallback
            direction = "Neutral"
            confidence = 0.50
            v4_l, v4_h = 0.10, 0.30
            v24_l, v24_h = 0.30, 0.80
            
    else:
        # Default Neutral match
        direction = "Neutral"
        confidence = 0.50
        v4_l, v4_h = 0.05, 0.15
        v24_l, v24_h = 0.15, 0.40
        
        # If still no assets detected, default to a couple of major ones
        if not affected_assets:
            affected_assets = ["EURUSD", "GOLD"]

    # Format asset tags with individual directions
    formatted_tags = []
    for asset in set(affected_assets):
        asset_dir = "Neutral"
        if matched_precedent and "impacts" in matched_precedent:
            impacts = matched_precedent["impacts"]
            if asset in impacts:
                asset_dir = impacts[asset][0]
            elif "USD" in impacts:
                dir_val = impacts["USD"][0]
                if asset in ["EURUSD", "GBPUSD", "AUDUSD", "GOLD", "SILVER", "COPPER"]:
                    asset_dir = "Bearish" if dir_val == "Bullish" else "Bullish"
                else:
                    asset_dir = dir_val
        formatted_tags.append(f"{asset} ({asset_dir})")
    tags_str = ", ".join(formatted_tags)
    
    # Determine impact severity (High, Medium, Low) based on 4-hour high volatility
    if direction == "Neutral":
        severity = "Low"
    elif v4_h >= 0.8:
        severity = "High"
    elif v4_h >= 0.25:
        severity = "Medium"
    else:
        severity = "Low"

    return {
        "asset_tags": tags_str,
        "impact_direction": direction,
        "volatility_4h": f"{v4_l:.2f}% - {v4_h:.2f}%",
        "volatility_24h": f"{v24_l:.2f}% - {v24_h:.2f}%",
        "confidence_score": round(confidence, 2),
        "impact_severity": severity
    }

# Mock news item generator for feeding live updates from earliest premium sources
MOCK_HEADLINES = [
    ("Powell signals Fed rate cut cycles are likely delayed due to sticky CPI core inflation", "hawkish_fed"),
    ("US Consumer Price Index (CPI) surges 3.8% YoY, beating consensus estimates of 3.4%", "cpi_beat"),
    ("US inflation cools rapidly to 2.9% in July, bolstering case for urgent rate cuts", "cpi_miss"),
    ("US Non-Farm Payrolls (NFP) jump by 275k, blowing past expected 190k increase", "nfp_beat"),
    ("US economy adds only 114k jobs, raising recession fears and Sahm Rule alerts", "nfp_miss"),
    ("OPEC+ members agree to surprise voluntary production cuts of 2.2 million barrels per day", "opec_cut"),
    ("Geopolitical conflict escalates in Middle East following drones targeting oil corridor tankers", "safe_haven"),
    ("Saudi Arabia ready to ramp up crude output to defend market share, sparking price war", "opec_increase"),
    ("ECB President Lagarde warns wage inflation keeps hawkish rate hikes on the table", "hawkish_fed"),
    ("FOMC Statement: Fed cuts policy interest rates by 50bps to support softening job growth", "dovish_fed"),
    ("US Core Retail Sales surge 0.8% MoM, indicating resilient domestic economic demand", "cpi_beat"),
    ("Bank of Japan signals potential rate hike cycles ahead as yen drops to multi-decade low", "hawkish_fed"),
    ("Flash: Red Sea commercial shipping corridor suspended after military drone attacks", "safe_haven"),
    ("Gold prices break to record high above $2450/oz on aggressive global safe-haven buying", "safe_haven"),
    ("Waller says rate cut cycles are getting closer if inflation keeps cooling down", "dovish_fed"),
    ("Brent crude slides below $75 as OPEC+ outlines plans to gradually phase out supply cuts", "opec_increase"),
    ("BOE raises Bank Rate by 25bps, warning of second-round inflation threats", "hawkish_fed")
]

def generate_live_news_item() -> dict:
  """Generates a random news feed item simulating real-time high-speed feeds."""
  headline, trigger = random.choice(MOCK_HEADLINES)
  
  # Select high-frequency news channels
  channels = [
      ("Bloomberg Terminal [BBG]", "Bloomberg Terminal"),
      ("ForexFactory News Alert", "ForexFactory Feed"),
      ("X / Twitter @ZeroHedge Feed", "Twitter / @ZeroHedge"),
      ("X / Twitter @LiveSquawk Alert", "Twitter / @LiveSquawk"),
      ("Reuters Eikon squawk line", "Reuters Eikon"),
      ("Financial Times FastFT", "Financial Times"),
      ("FXStreet Real-Time Alerts", "FXStreet Feed")
  ]
  channel_prefix, source_name = random.choice(channels)
  
  full_headline = f"[{channel_prefix}] {headline}"
  impact = analyze_headline(headline)
  
  return {
      "timestamp": datetime.utcnow(),
      "headline": full_headline,
      "summary": f"Alert released via {source_name} feed reporting that {headline.lower()}. Instantaneous pricing volatility recorded on correlated pairs.",
      "source": source_name,
      **impact
  }
