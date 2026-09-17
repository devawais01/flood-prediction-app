// Human-readable labels, short descriptions, and grouping for the 20 model
// features. Keys must exactly match the column names the backend expects
// (see backend/model/meta.json -> feature_names).

export interface FeatureDef {
  key: string;
  label: string;
  help: string;
}

export interface FeatureGroup {
  title: string;
  icon: string;
  features: FeatureDef[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: 'Climate & Weather',
    icon: '🌧️',
    features: [
      { key: 'MonsoonIntensity', label: 'Monsoon Intensity', help: 'Severity of monsoon rainfall in the area' },
      { key: 'ClimateChange', label: 'Climate Change Impact', help: 'Degree of observed climate change effects' },
    ],
  },
  {
    title: 'Land & Environment',
    icon: '🌳',
    features: [
      { key: 'TopographyDrainage', label: 'Topography Drainage', help: 'How well local terrain drains water' },
      { key: 'Deforestation', label: 'Deforestation', help: 'Extent of forest loss in the region' },
      { key: 'Siltation', label: 'Siltation', help: 'Sediment build-up in rivers/waterways' },
      { key: 'Landslides', label: 'Landslides', help: 'Frequency/risk of landslides' },
      { key: 'Watersheds', label: 'Watershed Degradation', help: 'Condition of watershed areas' },
      { key: 'WetlandLoss', label: 'Wetland Loss', help: 'Extent of wetland area lost over time' },
      { key: 'CoastalVulnerability', label: 'Coastal Vulnerability', help: 'Exposure of coastline to flooding/storms' },
    ],
  },
  {
    title: 'Infrastructure',
    icon: '🏗️',
    features: [
      { key: 'RiverManagement', label: 'River Management', help: 'Quality of river channel management' },
      { key: 'DamsQuality', label: 'Dams Quality', help: 'Structural condition/quality of dams' },
      { key: 'DrainageSystems', label: 'Drainage Systems', help: 'Adequacy of urban/rural drainage systems' },
      { key: 'DeterioratingInfrastructure', label: 'Deteriorating Infrastructure', help: 'General infrastructure decay affecting flood defense' },
    ],
  },
  {
    title: 'Human & Land Use',
    icon: '🏙️',
    features: [
      { key: 'Urbanization', label: 'Urbanization', help: 'Level of urban development and land sealing' },
      { key: 'AgriculturalPractices', label: 'Agricultural Practices', help: 'Farming practices affecting runoff/absorption' },
      { key: 'Encroachments', label: 'Encroachments', help: 'Illegal or unplanned construction on flood-prone land' },
      { key: 'PopulationScore', label: 'Population Density', help: 'Population pressure in flood-prone zones' },
    ],
  },
  {
    title: 'Governance & Preparedness',
    icon: '🏛️',
    features: [
      { key: 'IneffectiveDisasterPreparedness', label: 'Disaster Preparedness Gaps', help: 'Weakness of disaster preparedness measures' },
      { key: 'InadequatePlanning', label: 'Inadequate Planning', help: 'Shortfalls in urban/regional planning' },
      { key: 'PoliticalFactors', label: 'Political Factors', help: 'Political/administrative influence on flood risk management' },
    ],
  },
];

export const ALL_FEATURES: FeatureDef[] = FEATURE_GROUPS.flatMap((g) => g.features);
