// SPDX-License-Identifier: MIT

//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from "./DataTypes.sol";

/**
 * @title OptyFiZapper interface
 * @author OptyFi
 */
interface IOptyFiZapper {
    function zapIn(
        address _token,
        uint256 _amount,
        bytes memory _permitParams,
        DataTypes.ZapData memory _zapParams
    ) external payable returns (uint256 sharesReceived);

    function zapOut(
        address _token,
        uint256 _amount,
        bytes memory _permitParams,
        DataTypes.ZapData memory _zapParams
    ) external returns (uint256 receivedAmount);

    function setSwapper(address _swapper) external;

    function getSwapper() external view returns (address);
}
