// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title Interface for LimitOrderSettings facet
 * @author OptyFi
 */
interface ILimitOrderSettings {
    /**
     * @notice sets the address of the treasury to send limit order fees to
     * @param _treasury the address of the treasury
     */
    function setTreasury(address _treasury) external;

    /**
     * @notice sets the code merkle proof required for the contract to make withdrawals/deposits from the vault
     * @param _proof the code merkle proof
     * @param _vault address of OptyFi vault to get codeProof for
     */
    function setCodeProof(bytes32[] memory _proof, address _vault) external;

    /**
     * @notice sets the account merkle proof required for the contract to make withdrawals/deposits from the vault
     * @param _proof the account merkle proof
     * @param _vault address of OptyFi vault to set accountProof
     */
    function setAccountProof(bytes32[] memory _proof, address _vault) external;

    /**
     * @notice sets the liquidation fee for a target vault
     * @param _fee the fee in basis point
     * @param _vault the target vault
     */
    function setVaultLiquidationFee(uint256 _fee, address _vault) external;

    /**
     * @notice sets the address of the OptyFiSwapper diamond
     * @param _swapDiamond the address of the OptyFiSwapper
     */
    function setSwapDiamond(address _swapDiamond) external;

    /**
     * @notice sets the address of the OptyFiOracle to read prices from
     * @param _oracle the address of the OptyFiOracle
     */
    function setOracle(address _oracle) external;
}
