export function calculateStockStatus(
    aktuellerBestand: number,
    sicherheitsBestand: number,
    meldebestand: number,
): 'ROT' | 'GELB' | 'GRUEN' {
    if (aktuellerBestand < sicherheitsBestand) return 'ROT';
    if (aktuellerBestand < meldebestand) return 'GELB';
    return 'GRUEN';
}

import {
    SAPMaterialData,
    SAPWerkData,
    SCMMetrics,
    EnrichedWerkData,
    EnrichedSAPMaterial
} from '../types/scm'

/**
 * Core SCM Analytics Calculation Engine.
 * Processes materials with multi-plant structures (werkeDaten).
 */
export class SCMEngineService {
    /**
     * Processes an array of raw SAP materials and enriches every plant entry with dynamic SCM metrics.
     *
     * @param rawMaterials - Raw material records parsed from mockMaterials.json
     * @returns Array of enriched materials with calculated metrics per plant
     */
    public static processMaterials(rawMaterials: SAPMaterialData[]): EnrichedSAPMaterial[] {
        return rawMaterials.map((material) => {
            // Extract vendor OTIF performance percentage at the material level
            const otif = material?.otifHistorie;
            const lieferungenGesamt = otif?.lieferungenGesamt ?? 0;
            const lieferungenPuenktlich = otif?.lieferungenPuenktlich ?? 0;
            const otifPercentage =
                lieferungenGesamt > 0
                    ? Math.round((lieferungenPuenktlich / lieferungenGesamt) * 100)
                    : 100;

            // Map and enrich each plant (Werk) individually
            const werkeDatenList = Array.isArray(material?.werkeDaten) ? material.werkeDaten : [];
            const enrichedWerke: EnrichedWerkData[] = werkeDatenList.map((werk) => {
                const metrics = this.calculateMetricsForWerk(material, werk, otifPercentage);
                return {
                    ...werk,
                    calculatedMetrics: metrics,
                };
            });

            return {
                ...material,
                werkeDaten: enrichedWerke,
            };
        });
    }

    /**
    * Computes SCM metrics for a single plant (Werk)
    * FORMULA BREAKDOWN:   
    * 
    * 1. Total Lead Time (WBZ):
    *    WBZ = Bearbeitungszeit (Purchasing) + Planlieferzeit (Vendor Lead Time) + Wareneingangszeit (Goods Receipt)
    * 
    * 2. Cumulative Demand in WBZ:
    *    Sum of planned order quantities (bedarfMenge) assigned to this specific plant.
    * 
    * 3. Dynamic Reorder Point (Dynamic Meldebestand):  
    *    Dynamic Meldebestand = Kumulierter Bedarf in WBZ + Sicherheitsbestand
    * 
    * 4. SCM Status (Traffic Light):   
    *    - ROT: Current Stock < Safety Stock   
    *    - GELB: Safety Stock <= Current Stock < Dynamic Meldebestand  
    *    - GRUEN: Current Stock >= Dynamic Meldebestand
    *    
    * 5. Tied-up Capital:    
    *   Gebundenes Kapital = Current Stock * Unit Price   
    * */

    private static calculateMetricsForWerk(
        material: SAPMaterialData,
        werkData: SAPWerkData,
        otifPercentage: number
    ): SCMMetrics {
        const params = werkData?.parameterWiederbeschaffung || {};
        const bestand = werkData?.bestandsDaten || {};
        const header = material?.materialHeader || {};

        //1. Calculate total Replenishment Lead Time (WBZ) in days
        const bearbeitungZeit = params.bearbeitungsZeit ?? 0;
        const planLieferZeit = params.planLieferZeit ?? 0;
        const wareneingangsZeit = params.wareneingangsZeit ?? 0;
        const wbzTage = bearbeitungZeit + planLieferZeit + wareneingangsZeit;

        //2. Cumulative order deman for orders assigned to this plant
        const orderList = Array.isArray(werkData?.auftraegeVorplan) ? werkData.auftraegeVorplan : [];
        const kumulierterBedarfInWBZ = orderList.reduce((acc, order) => acc + (order?.bedarfMenge ?? 0), 0);

        //3. Dynamic Reorder Point
        const sicherheitsbestand = bestand.sicherheitsBestand ?? 0;
        const dynamicMeldebestand = kumulierterBedarfInWBZ + sicherheitsbestand;

        //4. Determine Inventory Status Traffic Light
        const aktuellerLagerbestand = bestand.aktuellerLagerBestand ?? 0;

        const statusMeldeBestand = calculateStockStatus(
            aktuellerLagerbestand,
            sicherheitsbestand,
            dynamicMeldebestand
        );

        //5. Tied-Up Capital in EUR
        const stueckpreis = header.stueckpreis ?? 0;
        const gebundenesKapital = aktuellerLagerbestand * stueckpreis;

        return {
            werk: werkData.werk ?? 'UNKNOWN',
            werkBezeichnung: werkData.werkBezeichnung ?? 'UNKNOWN',
            istHauptWerk: werkData.istHauptWerk ?? false,
            wbzTage,
            kumulierterBedarfInWBZ,
            dynamicMeldebestand,
            statusMeldeBestand,
            otifPercentage,
            gebundenesKapital
        }
    }
}