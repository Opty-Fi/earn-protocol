// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @title Interface for HarvestCodeProvider Contract
 * @author Opty.fi
 * @notice Abstraction layer to DeFi exchanges like Uniswap
 * @dev Interface for facilitating the logic for harvest reward token codes
 */
interface IHarvestCodeProvider {
    /**
     * @dev Get the codes for harvesting the tokens using uniswap router
     * @param _vault Vault contract address
     * @param _rewardToken Reward token address
     * @param _underlyingToken Token address acting as underlying Asset for the vault contract
     * @param _rewardTokenAmount reward token amount to harvest
     * @return _codes List of harvest codes for harvesting reward tokens
     */
    function getHarvestCodes(
        address payable _vault,
        address _rewardToken,
        address _underlyingToken,
        uint256 _rewardTokenAmount
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get the optimal amount for the token while borrow
     * @param _borrowToken Address of token which has to be borrowed
     * @param _underlyingToken Token address acting as underlying Asset for the vault contract
     * @param _borrowTokenAmount amount of token to borrow
     * @return borrow token's optimal amount
     */
    function getOptimalTokenAmount(
        address _borrowToken,
        address _underlyingToken,
        uint256 _borrowTokenAmount
    ) external view returns (uint256);

    /**
     * @dev Get the underlying token amount equivalent to reward token amount
     * @param _rewardToken Reward token address
     * @param _underlyingToken Token address acting as underlying Asset for the vault contract
     * @param _amount reward token balance amount
     * @return equivalent reward token balance in Underlying token value
     */
    function rewardBalanceInUnderlyingTokens(
        address _rewardToken,
        address _underlyingToken,
        uint256 _amount
    ) external view returns (uint256);

    /**
     * @dev Get the no. of tokens equivalent to the amount provided
     * @param _underlyingToken Underlying token address
     * @param _amount amount in weth
     * @return equivalent WETH token balance in Underlying token value
     */
    function getWETHInToken(address _underlyingToken, uint256 _amount) external view returns (uint256);
}
