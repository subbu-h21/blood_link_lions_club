select pincodes.code, pincodes.region_id, regions.name as region_name
from pincodes
join regions on pincodes.region_id = regions.id
limit 10;
