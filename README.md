# Quai Transactor

This script is used to run load testing on the QUAI network. It uses a collection of wallets and sends transactions between them to test the network's capabilities.

## Prerequisites

- Node.js v14 or higher
- NPM v6 or higher
- Wallet data in `wallets.json` file

## Setup

1. Clone the repository:

```bash
git clone https://github.com/dominant-strategies/quai-transactor
```

2. Install the dependencies:

```bash
cd quai-transactor
npm i
```

## Usage

You can start every zone on group-0 with

```bash
npm start
```

You can run the script by using the following command.

```bash
node index.js --group <your_group> --zone <your_zone> --host <your_host>
```
Or you can use the short form of the options:

```bash
node index.js -g <your_group> -z <your_zone> -h <your_host>
```

Here is the explanation for each option:

- `--group, -g: The group that you want to use for the load testing.` Ex. group-0
- `--zone, -z: The zone that you want to use for the load testing.` Ex. zone-0-0
- `--host, -h: The hostname of the network provider. If not provided, it defaults to 'localhost'.`
