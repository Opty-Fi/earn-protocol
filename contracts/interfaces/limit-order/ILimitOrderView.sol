// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from "../../limit-order/DataTypes.sol";

/**
 * @title Interface for LimitOrderView
 * @author OptyFi
 */
interface ILimitOrderView {
    /**
     * @notice returns a users active limit order for a target vault
     * @param _user address of user
     * @param _vault address of vault
     * @return _order the active limit order
     */
    function userVaultOrder(address _user, address _vault) external view returns (DataTypes.Order memory _order);

    /**
     * @notice returns a boolean indicating whether a user has an active limit order on a vault
     * @param _user address of user
     * @param _vault address of vault
     * @return _hasActiveOrder boolean indicating whether user has an active order
     */
    function userVaultOrderActive(address _user, address _vault) external view returns (bool _hasActiveOrder);

    /**
     * @notice returns the liquidation fee for a given vault
     * @param _vault address of the non-stablecoin vault
     * @return _fee in basis points
     */
    function liquidationFee(address _vault) external view returns (uint256 _fee);

    /**
     * @notice returns address of the treasury
     * @return _treasury addres of the treasury
     */
    function treasury() external view returns (address _treasury);

    /**
     * @notice returns LimitOrderDiamond account merkle proof
     * @dev required for deposits/withdrawals in OptyFi Vaults
     * @return _proof merkle proof for limit order smart contract
     *         of the corresponding _vault
     * @param _vault address of OptyFi vault to get accountProof for
     */
    function accountProof(address _vault) external view returns (bytes32[] memory _proof);

    /**
     * @notice returns address of the OptyFi Oracle
     * @return _oracle address of the oracle
     */
    function oracle() external view returns (address _oracle);

    /**
     * @notice returns address of limit order operation contract address
     * @return _ops account that automates limit order
     */
    function ops() external view returns (address _ops);

    /**
     * @notice resolver function for automation relayer
     * @param _maker address of limit order creator
     * @param _vault address of the vault
     * @return _canExec whether Ops should execute the task
     * @return _execPayload data that executors should use for the execution
     */
    function canExecuteOrder(address _maker, address _vault)
        external
        view
        returns (bool _canExec, bytes memory _execPayload);

    /**
     * @notice returns the whitelisted state of a stablecoin vault
     * @param _vault address of stablecoin vault
     * @return boolean whether stablecoin vault is whitelisted
     */
    function stablecoinVaultWhitelisted(address _vault) external view returns (bool);

    /**
     * @notice returns the whitelisted state of a non-stablecoin vault
     * @param _vault address of non-stablecoin vault
     * @return boolean whether non-stablecoin vault is whitelisted
     */
    function vaultWhitelisted(address _vault) external view returns (bool);
}
