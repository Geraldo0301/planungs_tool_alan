import { Router, Request, Response, NextFunction } from 'express';
import { loadRawMaterials } from '../repositories/materialsRepository';
import { SCMEngineService } from '../services/scmEngine'; import { start } from 'repl';
4

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(
            1,
            parseInt(req.query.page as string) || 1,
        );

        const limit = Math.min(
            50000,
            Math.max(1, parseInt(req.query.limit as string) || 50),
        );

        const search = (
            typeof req.query.search === 'string'
                ? req.query.search
                : ''
        ).trim().toLowerCase();

        const materials = await loadRawMaterials();

        const filtered = search
            ? materials.filter(
                (material) =>
                    material.materialHeader?.materialNummer
                        ?.toLowerCase()
                        .includes(search) ||
                    material.materialHeader?.bezeichnung
                        ?.toLowerCase()
                        .includes(search) ||
                    material.materialHeader?.produktHierarchieBezeichnung
                        ?.toLowerCase()
                        .includes(search),
            )
            : materials;

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;

        const pageMaterials = filtered.slice(
            startIndex,
            startIndex + limit,
        );

        const data = SCMEngineService.processMaterials(pageMaterials);

        return res.json({
            info: {
                totalItems,
                totalPages,
                currentPage: page,
                pageSize: limit,
            },
            data,
        });
    } catch (error) {
        return next(error);
    }
},
);

router.get('/:id',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            if (!id || typeof id !== 'string') {
                return res.status(400).json({
                    message: 'Invalid Materialnummer',
                });
            }

            const materials = await loadRawMaterials();
            const normalizedId = id.trim().toUpperCase();

            const material = materials.find(
                (item) => item.materialHeader?.materialNummer?.toUpperCase() ===
                    normalizedId,
            );

            if (!material) {
                return res.status(404).json({
                    message: `Material mit Nummer '${id}' wurde nicht gefunden`,
                });
            }

            const [enrichedMaterial] =
                SCMEngineService.processMaterials([material]);

            return res.json(enrichedMaterial);
        } catch (error) {
            return next(error);
        }
    },
);

export default router;