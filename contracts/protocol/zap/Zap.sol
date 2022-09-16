//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

// helper contracts
import { ZapInternal } from "./ZapInternal.sol";
import { Ownable } from "@solidstate/contracts/access/ownable/Ownable.sol";

// libraries
import { DataTypes } from "./lib/DataTypes.sol";
import { ZapStorage } from "./ZapStorage.sol";

// interfaces
import { IZap } from "./IZap.sol";

/**
 * @title Zap
 * @author OptyFi
 */
contract Zap is IZap, ZapInternal, Ownable {
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
