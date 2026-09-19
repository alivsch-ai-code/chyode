/** Führt die Datenbereinigung einmalig aus und gibt aus, was gelöscht wurde. Aufruf: node dist/scripts/run-retention.js */
import { pool } from '../db/pool';
import { runRetention } from '../services/retention.service';

runRetention()
  .then((report) => console.log(JSON.stringify(report)))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
