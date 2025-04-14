import express from "express";
import cors from "cors";
import yahooFinance from "yahoo-finance2";

const app = express();
const port = 4000;

app.use(cors());

const indices: Record<string, { symbol: string; name: string }> = {
  "United States of America": { symbol: "^GSPC", name: "S&P 500" },
  "Brazil": { symbol: "^BVSP", name: "IBOVESPA" },
  "Germany": { symbol: "^GDAXI", name: "DAX" },
  "Japan": { symbol: "^N225", name: "Nikkei 225" },
  "United Kingdom": { symbol: "^FTSE", name: "FTSE 100" },
  "France": { symbol: "^FCHI", name: "CAC 40" },
  "Canada": { symbol: "^GSPTSE", name: "S&P/TSX" },
  "India": { symbol: "^BSESN", name: "SENSEX" },
  "Australia": { symbol: "^AXJO", name: "ASX 200" },
  "China": { symbol: "000001.SS", name: "SSE Composite" },
  "Russia": { symbol: "IMOEX.ME", name: "MOEX" },
  "South Korea": { symbol: "^KS11", name: "KOSPI" },
  "Italy": { symbol: "FTSEMIB.MI", name: "FTSE MIB" },
  "Spain": { symbol: "^IBEX", name: "IBEX 35" },
  //"Mexico": { symbol: "^MXX", name: "IPC" },
  "South Africa": { symbol: "J203.JO", name: "FTSE/JSE Top 40" },
  "Saudi Arabia": { symbol: "TASI.SR", name: "TASI" },
  "Indonesia": { symbol: "^JKSE", name: "IDX Composite" },
  "Switzerland": { symbol: "^SSMI", name: "SMI" },
  "Sweden": { symbol: "^OMX", name: "OMX" },
  "Netherlands": { symbol: "^AEX", name: "AEX" },
  "Turkey": { symbol: "XU100.IS", name: "BIST 100" }
};

app.get("/api/market-indices", async (req, res) => {
  const result: Record<string, { index: string; gain: number;open: boolean}> = {};

  for (const [country, { symbol, name }] of Object.entries(indices)) {
    try {
      const quote = await yahooFinance.quote(symbol);
      console.log(quote);
      
      result[country] = {
        index: name,
        gain: quote.regularMarketChangePercent ?? 0,
        open: quote.marketState === "REGULAR" 
      };

    } catch (err) {
      console.error(`Error fetching ${symbol}`, err);
    }
  }
  //console.log(result);
  res.json(result);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});