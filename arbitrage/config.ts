import { JsonRpcProvider } from "ethers";

export const V3_POOL_FEE = 3000;
export const PROVIDER_URL = "https://sepolia.infura.io/v3/key";

// const tokenInV3 = "0xa30A4e6C1f854ba0a51FfAF3b8A4E26f61951411"; // usdc
// const tokenOutV3 = "0xd609b0dF13257cDBE8B981071ecA4F92b52367A4"; // weth

export const TOKEN_IN = "0xa30A4e6C1f854ba0a51FfAF3b8A4E26f61951411"; // usdc
// const tokenOutV2 = "0xa30A4e6C1f854ba0a51FfAF3b8A4E26f61951411"; // usdc

export const V2_POOL_CONTRACT = "0xc601E915f53d050049a9Fd548D5613B86307C6a0";
export const V3_POOL_CONTRACT = "0x280eB6bCDE070B20F877B8E758e9d9D997D427E4";

// const routerV2Contract = "0xee567fe1712faf6149d80da1e6934e354124cfe3";
export const QUOTER_CONTRACT = "0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3";

export const PROVIDER = new JsonRpcProvider(PROVIDER_URL);

export const MIN_AMOUNT_FOR_ARBITRAGE = 10000; // 10k$
export const MAX_AMOUNT_FOR_ARBITRAGE = 5000000; // 5mln$

export const STEP_FOR_ARBITRAGE = 10000; // 10k$

// example: if we found best range with best optimal amount
// we decrease step for arbitrage in 10 times and try to find better optimal amount
// decrease step for arbitrage in 10 times for our case: 10k$ / 10 = 1k$
export const DECREASE_STEP_FOR_ARBITRAGE = 10;