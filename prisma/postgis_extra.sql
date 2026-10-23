-- Tempel di baris paling bawah migration.sql hasil "--create-only"
CREATE OR REPLACE FUNCTION hotels_set_geom() RETURNS trigger AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hotels_set_geom_trg
BEFORE INSERT OR UPDATE OF lat, lng ON "hotels"
FOR EACH ROW EXECUTE FUNCTION hotels_set_geom();
