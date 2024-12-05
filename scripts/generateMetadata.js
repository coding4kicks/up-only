const fs = require('fs');
const path = require('path');

const ExternalUrl = 'TBD';

let idCounter = 0;

function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

// Function to create NFT metadata
function createMetadataFile(imageFilePath, outputDirectory, baseUrl, category) {
  const fileName = path.basename(imageFilePath, path.extname(imageFilePath));
  idCounter = category === 'easter' ? idCounter : idCounter + 1;

  // Split the file name into parts
  const [primaryPart, secondaryPart] = fileName
    .split('-')
    .map(part => part.trim());
  const attributes = secondaryPart.split('_').map(attr => attr.trim());

  // Construct NFT name from the parts
  const nftName = `${attributes.join(' ')}`;

  // Create metadata object
  const metadata = {
    name: nftName,
    description: `Up Only ${nftName}`,
    image: `${baseUrl}/${path.basename(imageFilePath)}`,
    external_url: `${ExternalUrl}/nft/${path.basename(imageFilePath)}`,
    attributes: {
      trait_type: 'Category',
      value: capitalizeFirstLetter(category)
    }
  };

  // Save metadata as JSON
  const metadataFileName = `${category === 'easter' ? 131 : idCounter}.json`;
  const metadataFilePath = path.join(outputDirectory, metadataFileName);
  fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));

  console.log(`Metadata for ${fileName} created at ${metadataFilePath}`);
}

// Function to delete and recreate the metadata directory
function resetMetadataDirectory(parentDirectory) {
  const metadataDirectory = path.join(parentDirectory, 'metadata');

  if (fs.existsSync(metadataDirectory)) {
    console.log(
      `Deleting existing metadata directory at ${metadataDirectory}...`
    );
    fs.rmSync(metadataDirectory, { recursive: true, force: true });
    console.log(`Deleted metadata directory.`);
  }

  // Recreate the metadata directory
  fs.mkdirSync(metadataDirectory);
  console.log(`Created new metadata directory at ${metadataDirectory}.`);

  return metadataDirectory;
}

// Function to process all image files in a directory (recursively)
function processImages(parentDirectory, baseUrl) {
  const metadataDirectory = resetMetadataDirectory(parentDirectory);
  const assetsDirectory = path.join(parentDirectory, 'assets');

  // Read files and subdirectories recursively
  const readDirectory = (directory, parentName) => {
    const files = fs.readdirSync(directory);

    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Process subdirectory
        readDirectory(filePath, file);
      } else if (
        ['.png', '.jpg', '.jpeg', '.gif'].includes(
          path.extname(file).toLowerCase()
        )
      ) {
        // Process image file
        createMetadataFile(
          filePath,
          metadataDirectory,
          path.join(baseUrl, parentName),
          parentName
        );
      }
    });
  };

  readDirectory(assetsDirectory, 'assets');
}

// Main function to run the script
function main() {
  console.log('FU');
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      'Usage: node generateMetadata.js <parent_directory> <base_url>'
    );
    process.exit(1);
  }

  const parentDirectory = args[0];
  const baseUrl = args[1];

  if (!fs.existsSync(parentDirectory)) {
    console.error(`Error: Directory "${parentDirectory}" does not exist.`);
    process.exit(1);
  }

  console.log(
    `Generating metadata for images in ${parentDirectory} with base URL ${baseUrl}...`
  );
  processImages(parentDirectory, baseUrl);
  console.log('Metadata generation complete.');
}

// Run the script
main();
