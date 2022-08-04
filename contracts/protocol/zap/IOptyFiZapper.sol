// SPDX-License-Identifier: MIT

//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from "./DataTypes.sol";

/**
 * @title OptyFiZapper interface
 * @author OptyFi
 */
interface IOptyFiZapper {
    function zapInETH(DataTypes.ZapData memory _zapParams) external payable;

    function zapIn(
        address _token,
        uint256 _amount,
        DataTypes.ZapData memory _zapParams
    ) external;

    function zapOut(
        address _token,
        uint256 _amount,
        DataTypes.ZapData memory _zapParams
    ) external;

    function setSwapper(address _swapper) external;
}
