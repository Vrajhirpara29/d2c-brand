import re
from datetime import datetime

# Mapping from CFTC report names to our dashboard asset codes
CFTC_ASSET_MAPPING = {
    "EURO CURRENCY": "EURUSD",
    "BRITISH POUND": "GBPUSD",
    "JAPANESE YEN": "USDJPY",
    "AUSTRALIAN DOLLAR": "AUDUSD",
    "CANADIAN DOLLAR": "USDCAD",
    "SWISS FRANC": "USDCHF",
    "GOLD": "GOLD",
    "SILVER": "SILVER",
    "COPPER": "COPPER",
    "CRUDE OIL, LIGHT SWEET": "WTI",
    "BRENT CRUDE": "BRENT",
    "NATURAL GAS": "NATURAL_GAS"
}

def parse_cftc_text_report(report_text: str):
    """
    Parses a typical CFTC COT textual report (Legacy format).
    It extracts the Non-Commercial Long and Short contracts for target assets.
    """
    results = {}
    
    # Split the report by asset sections
    # Typical section divider is uppercase asset title followed by details
    # We will search for keywords corresponding to our mapped assets
    for cftc_name, asset_code in CFTC_ASSET_MAPPING.items():
        # Match asset name, e.g. "EURO CURRENCY - CHICAGO MERCANTILE EXCHANGE"
        # Case insensitive regex match
        pattern = re.compile(rf"{cftc_name}.*?\n(.*?)(?=\n[A-Z\s,]+ - |\Z)", re.DOTALL | re.IGNORECASE)
        match = pattern.search(report_text)
        
        if match:
            section_content = match.group(1)
            
            # Now let's extract the Non-Commercial positions
            # In a legacy report, the row layout is usually:
            # NON-COMMERCIAL      |   COMMERCIAL    |   TOTAL      |   NONREPORTABLE
            # LONG   |  SHORT     |  LONG  |  SHORT |  LONG | SHORT |  LONG | SHORT
            # 123,456|  78,910    |  ...   |  ...   |  ...  | ...   |  ...  | ...
            
            # Let's find rows containing numbers
            # We can search for lines under "NON-COMMERCIAL" or just grab the first line of numbers
            # inside the section, which represents Long, Short for Non-Commercial, Commercial, etc.
            lines = [line.strip() for line in section_content.split('\n') if line.strip()]
            
            # Regex to find lines with contract numbers (comma separated or spaces)
            # E.g. "124,561      67,821      45,901"
            number_lines = []
            for line in lines:
                # Remove spaces between digits and commas, look for groups of numbers
                nums = re.findall(r'\b\d{1,3}(?:,\d{3})*\b|\b\d+\b', line)
                if len(nums) >= 2:
                    # Clean commas
                    clean_nums = [int(num.replace(',', '')) for num in nums]
                    number_lines.append(clean_nums)
            
            if number_lines:
                # Typically, the first line of numbers contains:
                # [Non-Comm Long, Non-Comm Short, Commercial Long, Commercial Short, Total Long, Total Short]
                # Let's check if the counts match typical layout
                data_row = number_lines[0]
                if len(data_row) >= 2:
                    long_contracts = data_row[0]
                    short_contracts = data_row[1]
                    net_position = long_contracts - short_contracts
                    
                    results[asset_code] = {
                        "long_contracts": long_contracts,
                        "short_contracts": short_contracts,
                        "net_position": net_position
                    }
                    
    return results
