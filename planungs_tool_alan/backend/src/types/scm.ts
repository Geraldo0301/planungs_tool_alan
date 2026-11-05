//================================
// Basic SAP Structures
//================================

export interface SAPOrder {
    auftragsNummer: string;
    zielMaschine?: string;
    bedarfDatum?: string;
    bedarfMenge?: number;
    zielWerk?: number;

    // Additional fields can be added as needed
}

export interface SAPEinkaufZufluss {
    auftragsNummer: string;
    lieferDatum: string;
    menge: number;
    quelle: string;
}

//Individual goods movements
export interface SAPMBewegung {
    buchungsDatum: string;
    bwart: string;
    bwartText: string;
    menge: number;
    //soll haben kennzeichen
    shkzg: 'S' | 'H';
    referenzDokument?: string;
    lagerOrt?: string;
    benutzer?: string;
}

export interface SAPWerkData {
    werk?: string;
    werkBezeichnung?: string;
    istHauptWerk?: boolean;
    bestandsDaten?: {
        aktuellerLagerBestand?: number;
        sicherheitsBestand?: number;
        meldeBestand?: number;
    };
    parameterWiederbeschaffung?: {
        bearbeitungsZeit?: number;
        planLieferZeit?: number;
        wareneingangsZeit?: number;
    };
    auftraegeVorplan?: SAPOrder[];
    //Pending orders, purchase orders, etc. can be added as needed
    einkaufZufluss?: SAPEinkaufZufluss[];
    //Individual goods movements
    bewegungen?: SAPMBewegung[];
}

export interface SAPHistorieSollIstItem{
    jahr?: number;
    monat?: number;
    sollMenge?: number;
    istMenge?: number;
}

export interface NachFolgeEingeschaften{
    isReplacement?: boolean;
    vorgaengeMaterial?: string;
    ersetzungGrund?: string;
}

export interface SAPMaterialHeader {
    materialNummer?: string;
    bezeichnung?: string;
    produktHierarchie?: string;
    produktHierarchieBezeichnung?: string;
    mengeEinheit?: string;
    bescahffungsArt?: string;
    stueckpreis?: number;
    waehrung?: string;
    sapKlassifizierung?: {
        abcKennzeichen?: string;
        kritischesMontageTeilFlag?: boolean;
    }

    //Substitution and replacement properties
    nachFolgeEingeschaften?: NachFolgeEingeschaften;
    //Minimum and rounding properties
    moq?: number;
}

export interface SAPMaterialData{
    materialHeader?: SAPMaterialHeader;
    werkeDaten?: SAPWerkData[];
    otifHistorie?: {
        lieferungenGesamt?: number;
        lieferungenPuenktlich?: number;
    };
    historieSollIst?: SAPHistorieSollIstItem[];
}

//Metrics and calculations related to stock status
export interface SCMMetrics{
    werk: string;
    werkBezeichnung: string;
    istHauptWerk: boolean;
    wbzTage?: number;
    kumulierterBedarfInWBZ: number;
    dynamicMeldebestand?: number;
    statusMeldeBestand?: 'ROT' | 'GELB' | 'GRUEN';
    otifPercentage: number;
    gebundenesKapital: number;
}

//Metrics and calculations related to goods movements
export interface MovementMetrics{
    totalWarenausgangMenge: number; //Total quantity of goods issued
    totalWareneingangMenge: number; //Total quantity of goods received
    letzterWareneingangDatum?: string; //Date of the last goods receipt
    letzterWarenausgangDatum?: string; //Date of the last goods issue
    tageSeitLetzterWarenausgang?: number; //Days since the last goods issue
    statusBewegung: "ACTIVE" | "SLOW" | "DEAD" | "NEVER"; //Status of the goods movement
    statusBewegungText: string; //Textual representation of the goods movement status
    //Acumulated obsolescence risk value in Euro (In case inactive/obsolete materials are still in stock)
    obsoleszenzRisikoWertEuro: number; 
}

export interface EnrichedWerkData extends SAPWerkData{
    calculatedMetrics: SCMMetrics;
    movementMetrics?: MovementMetrics;
}

export interface EnrichedSAPMaterial extends SAPMaterialData {
    werkeDaten?: EnrichedWerkData[];
}

export interface EnrichedHistorieSollIst {
    jahr: number;
    monat: number;
    monatsname: string;
    sollMenge: number;
    istMenge: number;
    abweichungMenge: number; //Ist - Soll
    abweichungProzent: number; // ((Ist - Soll) / Soll) * 100
    abweichungWertEuro: number; //abweichungMenge * stueckpreis
}

//Formatted object for the render on Movements modules
export interface ItemMovementsAnalysis {
    materialnummer: string;
    bezeichnung: string;
    werk: string;
    aktuellerLagerbestand: number;
    stueckpreis: number;
    waehrung: string;
    totalWeQty: number;
    totalWaQty: number;
    lastWaDateStr: string;
    lastWeDateStr: string;
    bewegungenCount: number;
    lagerwertEur: number;
    statusCat: "ACTIVE" | "SLOW" | "DEAD" | "NEVER";
    statutsText: string;
}

//Filter state and API response
export interface FilterState{
    searchQuery: string;
    werk: string;
    abcKennzeichen: string;
    statusMeldebestand: string;
    onlyCriticalParts: boolean;
    movementStatusFilter?: "ALL" | "ACTIVE" | "SLOW" | "DEAD" | "NEVER";
    inactivityYears?: number;
}

export interface MaterialApiResponse {
    info: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        pageSize: number;
    };
    data: EnrichedSAPMaterial[];
}

export type SAPMaterial = EnrichedSAPMaterial;

//================================================
//COMBINED METRICS (Gesundheit & Ohne Bedarf)
//================================================

export interface CombinedStockHealthMtrics {
    hasFutureDemand: boolean; //Future demand?
    totalFutureDemandQty: number; //Future Requested qty
    lastWaDaysAgo: number; // Days since last Warenausgang
    reachYears: number; //Reacht in years (Reichweite)

    //Unified Stock Health
    integratedRiskCategory:
    |"DEAD_AND_NO_DEMAND" //Totes Material
    |"NO_DEMAND_ACTIVE" //No projected future demand
    |"INACTIVE_WITH_DEMAND" //Historic inactive (But with future order)
    |"HEALTHY" //Regular healthy flow
    |"UNSTOCKED_DEMAND" //Future demand without stock
}

//Extension for the visualization table in React
export interface CombinedAnalysisItem {
    code: string;
    desc: string;
    prodHier: string;
    werk: string;
    aktuellerLagerbestand: number;
    stueckpreis: number;
    waehrung: string;
    lagerwertEur: number;

    //Past movements
    totalWaQty: number;
    lastWaDateStr: string;
    lastWaDaysAgo: number;

    //Future demand
    hasFutureDeman: boolean;
    futureOrdersCount: number;
    totalFutureDemandQty: number;

    //Unified Classification
    riskCategory: CombinedStockHealthMtrics["integratedRiskCategory"];
    statusBadgeText: string;
    actionRecommendation: string;
}
