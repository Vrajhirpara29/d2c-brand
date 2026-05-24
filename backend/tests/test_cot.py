import pytest
from app.parser import parse_cftc_text_report
from app.news import analyze_headline

def test_net_position_calc():
    """Verify the arithmetic behind Net Contract shifts."""
    # Test typical report format snippet
    sample_report = """
    EURO CURRENCY - CHICAGO MERCANTILE EXCHANGE
    Commitments of Traders - Legacy Format
    NON-COMMERCIAL      |   COMMERCIAL
    LONG   |  SHORT     |  LONG  |  SHORT
    195,200   112,400     45,100   78,900
    """
    
    results = parse_cftc_text_report(sample_report)
    assert "EURUSD" in results
    eur_data = results["EURUSD"]
    
    assert eur_data["long_contracts"] == 195200
    assert eur_data["short_contracts"] == 112400
    assert eur_data["net_position"] == 82800  # 195200 - 112400

def test_asset_mapping():
    """Verify that parser correctly maps various CFTC names."""
    sample_report = """
    GOLD - CHICAGO BOARD OF TRADE
    NON-COMMERCIAL
    LONG   |  SHORT
    150,000    50,000
    
    CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE
    NON-COMMERCIAL
    LONG   |  SHORT
    220,000    80,000
    """
    results = parse_cftc_text_report(sample_report)
    assert "GOLD" in results
    assert "WTI" in results
    
    assert results["GOLD"]["net_position"] == 100000
    assert results["WTI"]["net_position"] == 140000

def test_headline_impact_engine_hawkish():
    """Test hawkish news precedent matches and outputs correct signals."""
    headline = "BREAKING: Powell strikes hawkish tone, warns Fed will hike rates next week"
    analysis = analyze_headline(headline)
    
    # Hawkish Fed should trigger USD impact (e.g. Bearish for EURUSD/Gold, Bullish for USDJPY)
    assert "impact_direction" in analysis
    # If no asset is mentioned, it defaults to the primary asset for that precedent (e.g. USD or Gold)
    # The default direction is Bearish for Gold, Bullish for USD
    assert analysis["confidence_score"] >= 0.70
    assert "Bearish" in analysis["impact_direction"] or "Bullish" in analysis["impact_direction"]

def test_headline_impact_engine_opec():
    """Test OPEC supply reduction headline matches WTI / Brent and predicts Bullish impact."""
    headline = "ALERT: OPEC agreed to supply cut to support crude prices"
    analysis = analyze_headline(headline)
    
    # OPEC cut -> Bullish for Oil/Energy (WTI, BRENT)
    assert "#WTI" in analysis["asset_tags"] or "#BRENT" in analysis["asset_tags"]
    assert analysis["impact_direction"] == "Bullish"
    assert analysis["confidence_score"] >= 0.85
    # Volatility should be higher for commodities/oil
    assert "0.97%" in analysis["volatility_4h"] or "1.00%" in analysis["volatility_4h"] or "0.95%" in analysis["volatility_4h"]

def test_headline_impact_engine_safe_haven():
    """Test geopolitical safe haven headlines trigger correct assets and bullish gold."""
    headline = "Tensions rise in Middle East after military airstrike; gold surges"
    analysis = analyze_headline(headline)
    
    assert "#GOLD" in analysis["asset_tags"]
    assert analysis["impact_direction"] == "Bullish"
    assert analysis["confidence_score"] >= 0.80

def test_neutral_headline():
    """Test that unrelated news falls back to Neutral impact."""
    headline = "Apple releases new iPhone 18 with advanced camera features"
    analysis = analyze_headline(headline)
    
    assert analysis["impact_direction"] == "Neutral"
    assert analysis["confidence_score"] == 0.50
    assert "0.05%" in analysis["volatility_4h"]
