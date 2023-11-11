const handlebars = require('handlebars');
const fs = require('fs-extra');
const markdownHelper = require('./utils/helpers/markdown');
const templateData = require('./metadata/metadata');
const getSlug = require('speakingurl');
const dayjs = require('dayjs');
const repoName = require('git-repo-name');
const username = require('git-username');
const buildPdf = require('./utils/pdf.js');
const chokidar = require('chokidar');
const liveServer = require('live-server');

const srcDir = __dirname;
const outputDir = __dirname + '/../dist';

// Function to build HTML and PDF
function build() {
  console.log('Build start');

  // Clear dist dir
  fs.emptyDirSync(outputDir);

  // Copy assets
  fs.copySync(srcDir + '/assets', outputDir);

  // Build HTML
  handlebars.registerHelper('markdown', markdownHelper);
  const source = fs.readFileSync(srcDir + '/templates/index.html', 'utf-8');
  const template = handlebars.compile(source);
  const pdfFileName = `${getSlug(templateData.name)}.${getSlug(templateData.title)}.pdf`;
  const html = template({
    ...templateData,
    baseUrl: `https://${username()}.github.io/${repoName.sync()}`,
    pdfFileName,
    updated: dayjs().format('MMMM D, YYYY'),
  });

  fs.writeFileSync(outputDir + '/index.html', html);

  // Build PDF
  buildPdf(`${outputDir}/index.html`, `${outputDir}/${pdfFileName}`);

  console.log('Build end');
}

// Function to serve the content using live-server and watch for changes
function serveAndWatch() {
  const params = {
    port: 1234,
    root: outputDir,
    wait: 1000, // Milliseconds to wait for the build process to finish
  };

  // Start live-server
  const server = liveServer.start(params);

  // Ensure to close the server on process exit
  process.on('SIGINT', () => {
    server.close();
    process.exit();
  });

  // Watch for changes in metadata file
  const watcher = chokidar.watch(srcDir, { persistent: true });

  watcher.on('change', () => {0
    console.log('Changes detected. Ending serve and watch...');
    server.close();
    watcher.close();
    console.log('Rebuilding and serving...');
    build();
    serveAndWatch();
  });
}

// Determine whether to serve and watch for changes
if (process.argv.includes('--serve')) {
  build()
  serveAndWatch();
} else {
  // Initial build without serving and watching
  build();
}