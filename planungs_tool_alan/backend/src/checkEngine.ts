import {SCMEngineService} from './services/scmEngine';
import { loadRawMaterials } from './repositories/materialsRepository';

loadRawMaterials().then((materials) => {
    console.log(SCMEngineService.processMaterials(materials)[0].werkeDaten);
});
