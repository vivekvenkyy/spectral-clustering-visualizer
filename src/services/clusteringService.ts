import { Point, Metrics, ClusterResult, DatasetType, LinkageType } from '../types';

// --- Dataset Generation ---

const generateMoons = (n_samples: number = 200, noise: number = 0.08): Point[] => {
  const points: Point[] = [];
  const n_samples_out = Math.floor(n_samples / 2);
  const n_samples_in = n_samples - n_samples_out;

  // Generate the top moon
  for (let i = 0; i < n_samples_out; i++) {
    const angle = (i / (n_samples_out - 1)) * Math.PI;
    const x = Math.cos(angle) + (Math.random() - 0.5) * noise * 2;
    const y = Math.sin(angle) + (Math.random() - 0.5) * noise * 2;
    points.push({ x, y });
  }

  // Generate the bottom, interlocking moon
  for (let i = 0; i < n_samples_in; i++) {
    const angle = (i / (n_samples_in - 1)) * Math.PI;
    // Create an inverted semi-circle and shift it
    const x = 1 - Math.cos(angle) + (Math.random() - 0.5) * noise * 2;
    const y = 0.5 - Math.sin(angle) + (Math.random() - 0.5) * noise * 2;
    points.push({ x, y });
  }

  return points;
};

const generateBlobs = (n_samples: number = 200, centers: number = 3, cluster_std: number = 0.5): Point[] => {
  const points: Point[] = [];
  const centerPoints = Array.from({ length: centers }, () => ({
    x: (Math.random() - 0.5) * 8,
    y: (Math.random() - 0.5) * 8,
  }));
  for (let i = 0; i < n_samples; i++) {
    const center = centerPoints[i % centers];
    const x = center.x + (Math.random() - 0.5) * 2 * cluster_std;
    const y = center.y + (Math.random() - 0.5) * 2 * cluster_std;
    points.push({ x, y });
  }
  return points;
};

const generateCircles = (n_samples: number = 200, factor: number = 0.5, noise: number = 0.05): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < n_samples; i++) {
    const is_outer = i >= n_samples / 2;
    const r = is_outer ? 1.0 : factor;
    const angle = Math.random() * 2 * Math.PI;
    const x = r * Math.cos(angle) + (Math.random() - 0.5) * noise * 2;
    const y = r * Math.sin(angle) + (Math.random() - 0.5) * noise * 2;
    points.push({ x, y });
  }
  return points;
};

export const generateDataset = (type: DatasetType, n_samples: number = 200): Point[] => {
  switch (type) {
    case DatasetType.Moons:
      return generateMoons(n_samples);
    case DatasetType.Blobs:
      return generateBlobs(n_samples);
    case DatasetType.Circles:
      return generateCircles(n_samples);
    default:
      return [];
  }
};


// --- MOCK Clustering Algorithms & Metrics ---
// In a real application, these would run on a server. Here we simulate the output.

/**
 * MOCK 1: A simple split by x-axis. Good for simulating K-Means/Agglomerative
 * failure on non-globular data like Moons or Circles.
 */
const assignClustersByXSplit = (data: Point[], k: number): Point[] => {
  if (data.length === 0 || k <= 0) return [];
  const sortedData = [...data].sort((a, b) => a.x - b.x);
  const totalPoints = sortedData.length;
  return sortedData.map((point, index) => {
    const cluster = Math.min(k - 1, Math.floor((index / totalPoints) * k));
    return { ...point, cluster };
  });
};

/**
 * MOCK 2: A simple distance-based assignment. Good for simulating success
 * on globular data (blobs) for all algorithms.
 */
const assignClustersByCentroids = (data: Point[], k: number): Point[] => {
    if (data.length === 0 || k <= 0) return [];
    // Create k mock centroids by picking random points
    const means = Array.from({ length: k }, () => data[Math.floor(Math.random() * data.length)]);
    
    // Assign each point to the closest centroid
    return data.map(point => {
        let closestMeanIndex = 0;
        let minDistance = Infinity;
        means.forEach((mean, index) => {
            const distance = Math.sqrt(Math.pow(point.x - mean.x, 2) + Math.pow(point.y - mean.y, 2));
            if (distance < minDistance) {
                minDistance = distance;
                closestMeanIndex = index;
            }
        });
        return { ...point, cluster: closestMeanIndex };
    });
};

const generateMockMetrics = (data: Point[]): Metrics => {
  // Generate plausible but random metrics for demonstration
  const silhouette = Math.random() * 1.6 - 0.6; // Range ~[-0.6, 1.0]
  const calinskiHarabasz = Math.random() * 500 + 50;
  const daviesBouldin = Math.random() * 1.5 + 0.3;
  return {
    silhouette: parseFloat(silhouette.toFixed(3)),
    calinskiHarabasz: parseFloat(calinskiHarabasz.toFixed(3)),
    daviesBouldin: parseFloat(daviesBouldin.toFixed(3)),
  };
};

export const runSpectralClustering = (data: Point[], params: { n_clusters: number }, datasetType: DatasetType): ClusterResult => {
  let clusteredData: Point[];
  switch (datasetType) {
    case DatasetType.Moons:
      const n_samples_out = Math.floor(data.length / 2);
      clusteredData = data.map((p, index) => ({
          ...p,
          cluster: index < n_samples_out ? 0 : 1
      }));
      break;
    case DatasetType.Circles:
      const radius_threshold = 0.75; // Between inner (0.5) and outer (1.0) radius
      clusteredData = data.map(p => {
          const dist = Math.sqrt(p.x * p.x + p.y * p.y);
          return { ...p, cluster: dist > radius_threshold ? 0 : 1 };
      });
      break;
    default: // Blobs or Custom
      clusteredData = assignClustersByCentroids(data, params.n_clusters);
      break;
  }
  return {
    algorithm: 'Spectral Clustering',
    data: clusteredData,
    metrics: generateMockMetrics(clusteredData),
    params,
  };
};

export const runKMeans = (data: Point[], params: { n_clusters: number }, datasetType: DatasetType): ClusterResult => {
  let clusteredData: Point[];
  switch (datasetType) {
    case DatasetType.Moons:
    case DatasetType.Circles:
      clusteredData = assignClustersByXSplit(data, params.n_clusters);
      break;
    default: // Blobs or Custom
      clusteredData = assignClustersByCentroids(data, params.n_clusters);
      break;
  }
  return {
    algorithm: 'K-Means',
    data: clusteredData,
    metrics: generateMockMetrics(clusteredData),
    params,
  };
};

export const runAgglomerativeClustering = (data: Point[], params: { n_clusters: number; linkage: LinkageType }, datasetType: DatasetType): ClusterResult => {
  let clusteredData: Point[];
  switch (datasetType) {
    case DatasetType.Moons:
    case DatasetType.Circles:
      clusteredData = assignClustersByXSplit(data, params.n_clusters);
      break;
    default: // Blobs or Custom
      clusteredData = assignClustersByCentroids(data, params.n_clusters);
      break;
  }
  return {
    algorithm: 'Agglomerative Clustering',
    data: clusteredData,
    metrics: generateMockMetrics(clusteredData),
    params,
  };
};

export const runDBSCAN = (data: Point[], params: { eps: number }, datasetType: DatasetType): ClusterResult => {
  let clusteredData: Point[];
  switch (datasetType) {
    case DatasetType.Moons:
      const n_samples_out = Math.floor(data.length / 2);
      clusteredData = data.map((p, index) => ({
          ...p,
          cluster: index < n_samples_out ? 0 : 1
      }));
      break;
    case DatasetType.Circles:
      const radius_threshold = 0.75;
      clusteredData = data.map(p => {
          const dist = Math.sqrt(p.x * p.x + p.y * p.y);
          return { ...p, cluster: dist > radius_threshold ? 0 : 1 };
      });
      break;
    default: // Blobs or Custom - Simulate noise
      const k = 3;
      clusteredData = assignClustersByCentroids(data, k);
      // Mark a few points (e.g., 5%) as noise for demonstration
      const noiseCount = Math.floor(data.length * 0.05);
      for(let i = 0; i < noiseCount; i++) {
        const randomIndex = Math.floor(Math.random() * clusteredData.length);
        clusteredData[randomIndex].cluster = -1; // -1 conventionally represents noise
      }
      break;
  }
  return {
    algorithm: 'DBSCAN',
    data: clusteredData,
    metrics: generateMockMetrics(clusteredData),
    params,
  };
};

// --- CSV Parsing ---
export const parseCSV = (file: File, options: { dropLastColumn: boolean }): Promise<Point[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        if (rows.length < 2) { // Header + 1 data row
          throw new Error("CSV file must contain a header and at least one data row.");
        }
        rows.shift(); // Discard header

        let numericData = rows.map(row => {
            let values = row.split(',').map(v => parseFloat(v.trim()));
            if (options.dropLastColumn) {
                values = values.slice(0, -1);
            }
            // Keep only rows where all remaining values are numbers
            return values.every(v => !isNaN(v)) ? values : null;
        }).filter((row): row is number[] => row !== null);

        if (numericData.length === 0) {
            throw new Error("No valid numeric data rows found in the CSV file.");
        }

        const numFeatures = numericData[0].length;
        if (numFeatures < 2) {
            throw new Error(`The processed data has only ${numFeatures} feature(s). At least two are required for 2D visualization.`);
        }

        if (numFeatures > 2) {
          console.warn(`Dataset has ${numFeatures} features. Simulating dimensionality reduction (like PCA or t-SNE) by using the first two features for visualization.`);
        }
        
        const points: Point[] = numericData.map(row => ({ x: row[0], y: row[1] }));

        resolve(points);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};