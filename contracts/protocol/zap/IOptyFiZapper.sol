//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from "./DataTypes.sol";

/**
 * @title OptyFiZapper interface
 * @author OptyFi
 */
interface IOptyFiZapper {
    /**
     * @notice performs an arbitrary swap of a given token or ETH to deposit in a OptyFi Vault
     * @param _token the address of the input token
     * @param _amount input token amount to deposit
     * @param _permitParams ERC2612 permit params
     * @param _zapParams the zapParams for the zap to be performed
     * @return the shares received from the vault deposit
     */
    function zapIn(
        address _token,
        uint256 _amount,
        bytes memory _permitParams,
        DataTypes.ZapData memory _zapParams
    ) external payable returns (uint256);

    /**
     * @notice redeems the vault shares and performs an arbitrary swap
     * from the OptyFi Vault underlying token to any given token
     * @param _token the address of the input token
     * @param _amount input token amount to deposit
     * @param _permitParams ERC2612 permit params
     * @param _zapParams the zapParams for the zap to be performed
     * @return the amount of output tokens received
     */
    function zapOut(
        address _token,
        uint256 _amount,
        bytes memory _permitParams,
        DataTypes.ZapData memory _zapParams
    ) external returns (uint256);

    /**
     * @notice set swapper address
     * @param _swapper swapper address
     */
    function setSwapper(address _swapper) external;

    /**
     * @notice get swapper address
     */
    function getSwapper() external view returns (address);
}
