import { SecretVaultWrapper } from 'nillion-sv-wrappers';
// import { nillionConfig } from '../lib/config/nillion';
// import schema from '../lib/config/nillion-schema.json' assert { type: 'json' };

const nillionConfig = {
  orgCredentials: {
    secretKey: '',
    orgDid: ''
  },
  nodes: [
    {
      url: 'https://nildb-zy8u.nillion.network',
      did: 'did:nil:testnet:nillion1fnhettvcrsfu8zkd5zms4d820l0ct226c3zy8u',
    },
    {
      url: 'https://nildb-rl5g.nillion.network',
      did: 'did:nil:testnet:nillion14x47xx85de0rg9dqunsdxg8jh82nvkax3jrl5g',
    },
    {
      url: 'https://nildb-lpjp.nillion.network',
      did: 'did:nil:testnet:nillion167pglv9k7m4gj05rwj520a46tulkff332vlpjp',
    },
  ],
};


const schema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ASTRA Wallet Data",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "_id": {
        "type": "string",
        "format": "uuid",
        "coerce": true
      },
      "walletId": {
        "type": "object",
        "properties": {
          "$share": {
            "type": "string"
          }
        },
        "required": ["$share"]
      },
      "seed": {
        "type": "object",
        "properties": {
          "$share": {
            "type": "string"
          }
        },
        "required": ["$share"]
      },
      "networkId": {
        "type": "object",
        "properties": {
          "$share": {
            "type": "string"
          }
        },
        "required": ["$share"]
      }
    },
    "required": ["_id", "walletId", "seed", "networkId"]
  }
}

async function main() {
  try {
    const wrapper = new SecretVaultWrapper(
      nillionConfig.nodes,
      nillionConfig.orgCredentials
    );
    await wrapper.init();

    const collectionName = 'ASTRA Trading Data';
    const newSchema = await wrapper.createSchema(schema, collectionName);
    console.log('✅ New Collection Schema created:', newSchema);
    console.log('👀 Schema ID:', newSchema[0].result.data);
  } catch (error) {
    console.error('❌ Failed to create schema:', error);
    process.exit(1);
  }
}

main();
