//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import { OwnableInternal } from "@solidstate/contracts/access/ownable/OwnableInternal.sol";
import { IZap } from "./IZap.sol";
import { DataTypes } from "./DataTypes.sol";
import { ZapStorage } from "./ZapStorage.sol";
import { ZapInternal } from "./ZapInternal.sol";

/**
 * @title Zap
 * @author OptyFi
 */
contract Zap is IZap, ZapInternal, OwnableInternal {
    using ZapStorage for ZapStorage.Layout;

    /**
     * @inheritdoc IZap
     */
    function zapIn(
        address _token,
        uint256 _amount,
        bytes memory _permitParams,
        DataTypes.ZapData memory _zapParams
    ) external payable override returns (uint256 sharesReceived) {
        sharesReceived = _zapIn(_token, _amount, _permitParams, _zapParams);
    }

    /**
     * @inheritdoc IZap
     */
    function zapOut(
        address _token,
        uint256 _amount,
        bytes memory _permitParams,
        DataTypes.ZapData memory _zapParams
    ) external override returns (uint256 receivedAmount) {
        receivedAmount = _zapOut(_token, _amount, _permitParams, _zapParams);
    }

    /**
     * @inheritdoc IZap
     */
    function setSwapper(address _swapper) external override onlyOwner {
        ZapStorage.Layout storage _l = ZapStorage.layout();

        _setSwapper(_l, _swapper);
    }
}
