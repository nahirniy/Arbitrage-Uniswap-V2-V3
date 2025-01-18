import { ethers } from "ethers";
import { PROVIDER, QUOTER_CONTRACT, V2_POOL_CONTRACT, V3_POOL_CONTRACT } from "./config";
import { quoterABI } from "../abis/Quoter";
import { pairV2Abi } from "../abis/PairV2";
import { poolV3Abi } from "../abis/PoolV3";

export const getInitialData = async () => {
	const quoter = new ethers.Contract(QUOTER_CONTRACT, quoterABI, PROVIDER);
	const poolV2 = new ethers.Contract(V2_POOL_CONTRACT, pairV2Abi, PROVIDER);
	const poolV3 = new ethers.Contract(V3_POOL_CONTRACT, poolV3Abi, PROVIDER);

	const reserves = await poolV2.getReserves();
	const sqrtPriceX96 = (await poolV3.slot0())[0];
	const token0V2 = await poolV2.token0();
	const token1V2 = await poolV2.token1();
	const token0V3 = await poolV3.token0();
	const token1V3 = await poolV3.token1();

	return { reserves, sqrtPriceX96, token0V2, token1V2, token0V3, token1V3, quoter };
}