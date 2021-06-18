// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @title Interface for StrategyManager Contract
 * @author Opty.fi
 * @notice Central processing unit of the earn protocol
 * @dev Contains the functionality for getting the codes from the adapters
 */
interface IStrategyManager {
    /**
     * @dev Get the withdrawal codes step's count for the given stretagy hash
     * @param _investStrategyHash Hash of the strategy being used in vault contract
     * @return Returns the withdrawal codes steps count for the given stretagy hash
     */
    function getWithdrawAllStepsCount(bytes32 _investStrategyHash) external view returns (uint256);

    /**
     * @dev Get the deposit codes steps count for the given stretagy hash
     * @param _investStrategyHash Hash of the strategy being used in vault contract
     * @return Returns the deposit codes steps count for the given stretagy hash
     */
    function getDepositAllStepCount(bytes32 _investStrategyHash) external view returns (uint256);

    /**
     * @dev Get the claim reward token codes steps count for the given stretagy hash
     * @param _investStrategyHash Hash of the strategy being used in vault contract
     * @return Returns the claim reward token codes steps count for the given stretagy hash
     */
    function getClaimRewardStepsCount(bytes32 _investStrategyHash) external view returns (uint8);

    /**
     * @dev Get the harvest reward token codes steps count for the given stretagy hash
     * @param _investStrategyHash Hash of the strategy being used in vault contract
     * @return Returns the harvest reward token codes steps count for the given stretagy hash
     */
    function getHarvestRewardStepsCount(bytes32 _investStrategyHash) external view returns (uint8);

    /**
     * @notice Get the balance of vault in underlyingToken provided
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token (eg: DAI, USDC etc.) address
     * @param _investStrategyHash Hash of the strategy being used in vault contract
     * @return _balance Returns the balance of vault in underlyingToken provided
     */
    function getBalanceInUnderlyingToken(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash
    ) external view returns (uint256 _balance);

    /**
     * @dev Get codes for depositing all balance in the pool for the given strategy hash
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token (eg: DAI, USDC etc.) address
     * @param _investStrategyHash Hash of the strategy being used in vault contract
     * @param _stepIndex The index corresponding to the strategy step
     * @param _stepCount Total steps count in the strategy
     * @return _codes Returns codes for depositing all balance in pool for the given strategy hash
     */
    function getPoolDepositAllCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        uint256 _stepIndex,
        uint256 _stepCount
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get codes for withdrawing all balance from the pool for the given strategy hash
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token (eg: DAI, USDC etc.) address
     * @param _investStrategyHash Hash of the strategy being used in vault contract
     * @param _stepIndex The index corresponding to the strategy step
     * @param _stepCount Total steps count in the strategy
     * @return _codes Returns codes for withdrawing all balance from the pool for the given strategy hash
     */
    function getPoolWithdrawAllCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        uint256 _stepIndex,
        uint256 _stepCount
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get codes for claiming all reward tokens from pool for the given strategy hash
     * @param _vault Vault contract address
     * @param _investStrategyHash Hash of the strategy being used in vault contract
     * @return _codes Returns codes for claiming all reward tokens from pool for the given strategy hash
     */
    function getPoolClaimAllRewardCodes(address payable _vault, bytes32 _investStrategyHash)
        external
        view
        returns (bytes[] memory _codes);

    /**
     * @dev Get codes for harvesting all reward tokens from pool for the given strategy hash
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token (eg: DAI, USDC etc.) address
     * @param _investStrategyHash Hash of the strategy being used in vault contract
     * @return _codes Returns codes for harvesting all reward tokens from pool for the given strategy hash
     */
    function getPoolHarvestAllRewardCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get codes for harvesting some reward tokens from pool for the given strategy hash
     * @dev Amount of reward tokens to be harvest depends upon on convert percentage
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token (eg: DAI, USDC etc.) address
     * @param _investStrategyHash Hash of the strategy being used in vault contract
     * @param _vaultRewardStrategy Vault Reward strategy to get convert Percent (in basis)]
     * @return _codes Returns codes for harvesting some reward tokens from pool for the given strategy hash
     */
    function getPoolHarvestSomeRewardCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        DataTypes.VaultRewardStrategy memory _vaultRewardStrategy
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get the codes for spliting the withdraw fee shares between the treasury accounts
     * @dev Get the code for the the remaining amount to be transferred to the caller (user or msg.sender)
     * @param _treasuryShares Shares (in basis percent) for corresponding treasury account address
     * @param _account User's (msg.sender) address who is initiating withdraw
     * @param _underlyingToken Underlying toke address
     * @param _redeemAmountInToken Amount to be redeemed in token
     */
    function getSplitPaymentCode(
        DataTypes.TreasuryShare[] memory _treasuryShares,
        address _account,
        address _underlyingToken,
        uint256 _redeemAmountInToken
    ) external pure returns (bytes[] memory _treasuryCodes);

    /**
     * @dev Get the codes for updating the rewards accrued by a user in a vault
     * @param _vault Vault contract address
     * @param _from User's (msg.sender) address whose rewards are going to be updated
     * @return _codes Returns codes for updating the rewards of a user in a vault
     */
    function getUpdateUserRewardsCodes(address _vault, address _from) external view returns (bytes[] memory _codes);

    /**
     * @dev Get the codes for updating the user state in a vault
     * @dev User state includes the latest vault index and the user's last interaction timestamp
     * @param _vault Vault contract address
     * @param _from User's (msg.sender) address whose state is going to be updated
     * @return _codes Returns codes for updating the state of a user in a vault
     */
    function getUpdateUserStateInVaultCodes(address _vault, address _from)
        external
        view
        returns (bytes[] memory _codes);

    /**
     * @dev Get the codes for updating the $OPTY rate for a vault and the vault index
     * @param _vault Vault contract address
     * @return _codes Returns codes for updating the $OPTY rate for a vault and the vault index
     */
    function getUpdateRewardVaultRateAndIndexCodes(address _vault) external view returns (bytes[] memory _codes);

    /**
     * @notice Get the reward token for the given strategy hash
     * @param _investStrategyHash Hash associated with the strategy
     * @return _rewardToken Address of reward token
     */
    function getRewardToken(bytes32 _investStrategyHash) external view returns (address _rewardToken);
}
