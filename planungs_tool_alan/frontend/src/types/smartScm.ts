/**
 * types and structures for tournament-based forecasting & smart scm engine
 */

export * from "./scm";
export type MaterialBehaviorType = "HIGH_RUNNER" | "LOW_RUNNER";
export interface InfluentialMonth{
    monthName: string;
    avgQty: number;
    percentage: number;
}

/**
 * forecast point anchored to real year/month in chronological order
 */
export interface ChronologicalForecastPoint{
    jahr: number;
    monat: number; // 1-12
    menge: number;
}

/**
 * candidate model performance metrics inside backtesting tournament
 */
export interface TournamenctCandidate{
    modelName: string;
    rmsseScor: number; //root mean squared scaled error
    valForecast: number[]; // predicted forecast on validation window
    fullForecast: number[]; // full horizon preojected forecast
    inSampleFit: number[]; // historical fitted values
}

/**
 * comprehensive backtesting tournament evaluation result
 */
export interface TournamentResult{
    winningModelName: string;
    winningScore: number; // lowest rmsse score
    forecast: number[]; // winning forecast for requested horizon
    leaderboard: TournamenctCandidate[]; // ranked candidate models list
    validationHistory: number[]; // actual values during validation window
    trainHistory: number[]; // training history subset
}

/**
 * main output interface for smart scm calculation engine
 */
export interface SmartSCMCalculationResult{
    strategyUsed: string; // winning model name and rmsse score (e.g. "TSB (RMSSE: 0.842)")
    prognoseMensual: number[]; // 12-month calendar raw forecast array
    /**
     * chronological forecast points anchored to real future year/month
     * starts in the month following tha last available historical entry
     */
    prognoseChronologisch?: ChronologicalForecastPoint[];
    dynMeldebestand: number; // dynamic reorder point
    safetyStock: number; // dynamic safety stock 
    bedarfInWBZ: number; // accumulated forecast demand over lead time
    wbzTage: number; // lead time in days
    scmStatus?: "ROT" | "GELB" | "GRUEN"; // traffic light status indicator for UI
    moqIsFallback?: boolean; // true if minimum order quantity fallback was used
    explanation?: {
        leadTimeMonths: number;
        reasoning: string;
        peakWarning: string;
        totalAnalyzedMonths?: number;
        topInfluentialMonths?: InfluentialMonth[];
        trendReliable?: boolean;
    };
    /**
     * full backtesting tournament details and model leaderboard
     */
    tournamentDetails?: TournamentResult;
}