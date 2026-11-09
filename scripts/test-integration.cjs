
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

const arquivoAmbiente = path.resolve(__dirname, '../.env.test');

const configuracao = dotenv.config({
  path: arquivoAmbiente,
  override: true,
});

if (configuracao.error) {
  console.error('Não foi possível carregar o arquivo .env.test.');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (
  !databaseUrl ||
  !databaseUrl.startsWith('mysql://') ||
  !databaseUrl.includes('@127.0.0.1:3307/') ||
  !databaseUrl.endsWith('/hotelaria_reservas_test')
) {
  console.error('Conexão de testes inválida.');
  process.exit(1);
}

const jest = require.resolve('jest/bin/jest');

const resultado = spawnSync(
  process.execPath,
  [
    jest,
    '--runInBand',
    '--testRegex=.*\\.int-spec\\.ts$',
  ],
  {
    stdio: 'inherit',
    env: process.env,
  },
);

process.exit(resultado.status ?? 1);
