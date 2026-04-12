import hre from "hardhat";

async function main() {
  const ethers = hre.ethers;
  const usdcAddr = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const swapRouterAddr = "0x5969f3cfc1ffdfa22c779807aaf32033603f8be7";
  
  const provider = ethers.provider;
  
  // Get code for USDC
  const usdcCode = await provider.getCode(usdcAddr);
  console.log("USDC contract deployed:", usdcCode !== "0x");
  
  // Check SimpleSwapRouter balance
  const swapRouterBalance = await provider.getBalance(swapRouterAddr);
  console.log("SwapRouter ETH balance:", ethers.formatEther(swapRouterBalance));
  
  // Try to read USDC contract - is it ERC20?
  const usdcABI = ["function balanceOf(address) view returns (uint256)"];
  const usdcContract = new ethers.Contract(usdcAddr, usdcABI, provider);
  
  try {
    const swapRouterUSDCBalance = await usdcContract.balanceOf(swapRouterAddr);
    console.log("SwapRouter USDC balance:", ethers.formatUnits(swapRouterUSDCBalance, 6));
  } catch (err) {
    console.log("Error reading USDC balance:", (err as any).message);
  }
}

main().catch(console.error);

main().catch(console.error);
