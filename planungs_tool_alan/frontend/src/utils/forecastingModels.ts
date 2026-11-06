/**
 * Forecasting models used by the SCM tournament
 */
export interface TSBDemandDetails {
    //Estimated probability of positive demand per period
    //Example 0.65625 means 65.625%
    demandProbability: number;

    //estimated quantity conditional on positive deman
    //null means there are no positive observations to estimate it
    demandSizeWhenPositive: number | null;
}

export interface ModelForecastResult {
    modelName: string;
    forecast: number[];
    inSampleFit: number[];

    //additional information provided by TSB
    //other forecasting models can omit this property
    tsbDetails?: TSBDemandDetails;
}
/**
 * Converts a starting month and an offset into a month index from 0 to 11.
 *
 * Example:
 * startMonth = 11 → November.
 * offset = 2     → move forward two months.
 *
 * (11 - 1 + 2) % 12
 * = 12 % 12
 * = 0 → January.
 *
 * This helper is not used inside forecastTSB.
 */
function calendarMonthIndex(startMonth: number, offset: number): number {
    return (startMonth - 1 + offset) % 12;
}

/**
 * TSB — Teunter / Syntetos / Babai
 *
 * Used to forecast intermittent demand:
 * periods with demand mixed with periods without demand.
 *
 * ============================================================
 * COMPLETE EXAMPLE FOLLOWED THROUGHOUT THE CODE
 * ============================================================
 *
 * Assume history contains monthly demand requirements (Bedarf):
 * production demand plus customer demand, without double counting.
 *
 * Month 1:  0 units.
 * Month 2: 10 units.
 * Month 3:  0 units.
 * Month 4: 20 units.
 *
 * Function call:
 *
 * forecastTSB([0, 10, 0, 20], 3, 0.5, 0.5)
 *
 * history = [0, 10, 0, 20]
 * horizon = 3 → forecast the next three months.
 * alpha = 0.5 → controls how quickly demand probability changes.
 * beta  = 0.5 → controls how quickly demand size changes.
 *
 * We use 0.5 in this example to make the calculations easier.
 * The default values remain 0.15.
 *
 * Two variables describe demand:
 *
 * p = estimated probability that a period has demand.
 * z = estimated demand quantity when demand occurs.
 *
 * Forecast per period = p × z.
 *
 * For example:
 * p = 0.5 and z = 15
 * → 0.5 × 15 = 7.5 expected units per month.
 *
 * This does not mean exactly 7.5 units will be consumed.
 * It combines how often demand occurs with its typical size.
 *
 * WALKTHROUGH:
 *
 * Initial values:
 * p = 2 months with demand / 4 months = 0.5.
 * z = (10 + 20) / 2 = 15.
 *
 * Month   Actual   Estimate before   p after    z after
 *         demand   updating          updating   updating
 *   1        0         7.5            0.25       15
 *   2       10         3.75           0.625      12.5
 *   3        0         7.8125         0.3125     12.5
 *   4       20         3.90625        0.65625    16.25
 *
 * Final calculation:
 *
 * p × z = 0.65625 × 16.25 = 10.6640625.
 *
 * forecast = [10.6640625, 10.6640625, 10.6640625].
 *
 * NOTE ABOUT THIS IMPLEMENTATION:
 * It initializes p and z using the ENTIRE history, then loops
 * through that history again. Therefore, inSampleFit describes
 * a fit to known data, not a test of predictions made without
 * access to future observations.
 *
 * Assumptions:
 * history contains finite, nonnegative quantities.
 * horizon is a nonnegative integer.
 */
export function forecastTSB(
    history: number[],
    horizon: number,
    alpha: number = 0.15,
    beta: number = 0.15
): ModelForecastResult {
    //reject invalid inputs before performing any calculations
    //avoids negative quantities, invalid values or any out of parameters range
    if (!Number.isInteger(horizon) || horizon < 0) {
        throw new Error("horizon must be a nonnegative integer");
    }

    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
        throw new Error("alpha must be between 0 and 1");
    }

    if (!Number.isFinite(beta) || beta < 0 || beta > 1) {
        throw new Error("beta must be between 0 and 1");
    }

    if (history.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error("historsy must contain finite, nonnegative quantities");
    }

    // Count the historical periods.
    // Example: [0, 10, 0, 20] contains 4 values → n = 4.
    const n = history.length;

    // Without historical data, this implementation returns zeros.
    //
    // Example: history = [], horizon = 3
    // → forecast = [0, 0, 0].
    // → inSampleFit = [].
    if (n === 0) {
        return {
            modelName: "TSB",
            forecast: new Array(horizon).fill(0),
            inSampleFit: [],
        };
    }

    // Count periods with positive demand and add their quantities.
    let nonZeroCount = 0;
    let nonZeroSum = 0;

    for (const value of history) {
        if (value > 0) {
            nonZeroCount++;
            nonZeroSum += value;
        }

        // Example:
        //
        // value =  0 → skip the if. count = 0, sum = 0.
        // value = 10 → enter it.    count = 1, sum = 10.
        // value =  0 → skip the if. count = 1, sum = 10.
        // value = 20 → enter it.    count = 2, sum = 30.
    }

    // If all demand values are zero, return zero estimates.
    // This also prevents division by zero when calculating z.
    //
    // Example: history = [0, 0, 0, 0], horizon = 3
    // → forecast = [0, 0, 0].
    // → inSampleFit = [0, 0, 0, 0].
    //
    // Our example has nonZeroCount = 2, so execution continues.
    if (nonZeroCount === 0) {
        return {
            modelName: "TSB",
            forecast: new Array(horizon).fill(0),
            inSampleFit: new Array(n).fill(0),
            tsbDetails: {
                //the observed history contains only zero demand
                //this is a model estimate, not a guarantee
                demandProbability: 0,

                //no positive demand was observed
                demandSizeWhenPositive: null,
            },
        };
    }

    // Initial demand probability:
    // p = 2 / 4 = 0.5 → demand occurred in 50% of the months.
    let p = nonZeroCount / n;

    // Average quantity considering ONLY months with demand:
    // z = 30 / 2 = 15 units.
    let z = nonZeroSum / nonZeroCount;

    // Store one estimate for each historical period.
    const inSampleFit: number[] = [];

    for (let t = 0; t < n; t++) {
        // Array indexes start at 0.
        //
        // t = 0 → x = history[0] = 0.
        // t = 1 → x = history[1] = 10.
        // t = 2 → x = history[2] = 0.
        // t = 3 → x = history[3] = 20.
        const x = history[t];

        // Store the estimate BEFORE updating p and z
        // with the current period's actual demand.
        //
        // Math.max(0, ...) prevents a negative estimate.
        //
        // t = 0 → 0.5    × 15   = 7.5.
        // t = 1 → 0.25   × 15   = 3.75.
        // t = 2 → 0.625  × 12.5 = 7.8125.
        // t = 3 → 0.3125 × 12.5 = 3.90625.
        inSampleFit.push(Math.max(0, p * z));

        if (x > 0) {
            // DEMAND OCCURRED:
            // Move p toward 1, representing "demand occurred".
            //
            // Formula:
            // new p = previous p + alpha × (1 - previous p).
            //
            // Month 2, x = 10:
            // p = 0.25 + 0.5 × (1 - 0.25)
            //   = 0.25 + 0.375
            //   = 0.625.
            //
            // Month 4, x = 20:
            // p = 0.3125 + 0.5 × (1 - 0.3125)
            //   = 0.3125 + 0.34375
            //   = 0.65625.
            p = p + alpha * (1 - p);

            // Move z toward the observed demand quantity.
            // With beta = 0.5, move halfway toward that quantity.
            //
            // Month 2, x = 10:
            // z = 15 + 0.5 × (10 - 15)
            //   = 15 - 2.5
            //   = 12.5.
            //
            // Month 4, x = 20:
            // z = 12.5 + 0.5 × (20 - 12.5)
            //   = 12.5 + 3.75
            //   = 16.25.
            z = z + beta * (x - z);
        } else {
            // NO DEMAND OCCURRED:
            // Move p toward 0, representing "no demand occurred".
            //
            // Month 1, x = 0:
            // p = 0.5 + 0.5 × (0 - 0.5)
            //   = 0.5 - 0.25
            //   = 0.25.
            //
            // Month 3, x = 0:
            // p = 0.625 + 0.5 × (0 - 0.625)
            //   = 0.625 - 0.3125
            //   = 0.3125.
            //
            // z does NOT change: it estimates the quantity
            // consumed when demand actually occurs.
            p = p + alpha * (0 - p);
        }
    }

    // Final values after processing all historical periods:
    // p = 0.65625.
    // z = 16.25.
    //
    // finalRate = 0.65625 × 16.25 = 10.6640625.
    const finalRate = Math.max(0, p * z);

    // Repeat the final estimate for the next three months.
    //
    // We do not update p or z during the forecast horizon
    // because future actual demand is still unknown.
    //
    // Complete result:
    // {
    //   modelName: "TSB",
    //   forecast: [10.6640625, 10.6640625, 10.6640625],
    //   inSampleFit: [7.5, 3.75, 7.8125, 3.90625]
    // }
    return {
        modelName: "TSB",
        forecast: new Array(horizon).fill(finalRate),
        inSampleFit,
        tsbDetails: {
            //example: p = 0.65625 -> 65:625%
            demandProbability: p,

            //example z = 16.25 units when demand occurs
            demandSizeWhenPositive: z,
        },
    };
}

// Temporary checks. Remove after testing.
const example = forecastTSB([0, 10, 0, 20], 3, 0.5, 0.1);

console.log("Forecast:", example.forecast);
console.log("Historical fit:", example.inSampleFit);
console.log("TSB details:", example.tsbDetails);

const zeroHistory = forecastTSB([0, 0, 0], 2);
console.log("Zero history details:", zeroHistory.tsbDetails);

const emptyHistory = forecastTSB([], 2);
console.log("Empty history details:", emptyHistory.tsbDetails);