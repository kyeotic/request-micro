require('esbuild')
  .build({
    entryPoints: ['src/request.ts'],
    bundle: true,
    outfile: 'dist/request.js',
    platform: 'node',
    target: 'node14.4',
    minify: true,
  })
  .catch(() => process.exit(1))
