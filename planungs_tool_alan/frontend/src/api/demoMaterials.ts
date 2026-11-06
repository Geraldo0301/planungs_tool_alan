import axios from 'axios';
import type { DemoMaterial } from '../types/demo';

export async function getDemoMaterials(signal?: AbortSignal){
    const response = await axios.get<{data: DemoMaterial[] }>(
        'http://localhost:5000/api/materials', {signal}
    );
    return response.data.data;
}