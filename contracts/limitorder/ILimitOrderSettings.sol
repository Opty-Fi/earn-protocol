// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

interface ILimitOrderSettings {
    /**
     * @notice sets the address of the treasury to send limit order fees to
     * @param _treasury the address of the treasury
     */
    function setTreasury(address _treasury) external;

    /**
     * @notice sets the merkle proof required for the contract to make withdrawals/deposits from the vault
     * @param _proof the merkle proof
     */
    function setProof(bytes32[] memory _proof) external;

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