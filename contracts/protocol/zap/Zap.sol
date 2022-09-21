//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

// helper contracts
import { ZapInternal } from "./ZapInternal.sol";
import { OwnableInternal } from "@solidstate/contracts/access/ownable/OwnableInternal.sol";

// libraries
import { DataTypes } from "./lib/DataTypes.sol";
import { ZapStorage } from "./ZapStorage.sol";

// interfaces
import { IZap } from "./IZap.sol";

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
        ZapStorage.Layout storage _l = ZapStorage.layout();

        sharesReceived = _zapIn(_l, _token, _amount, _permitParams, _zapParams);
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
        ZapStorage.Layout storage _l = ZapStorage.layout();

        receivedAmount = _zapOut(_l, _token, _amount, _permitParams, _zapParams);
    }

    /**
     * @inheritdoc IZap
     */
    function setSwapper(address _swapper) external override onlyOwner {
        ZapStorage.Layout storage _l = ZapStorage.layout();

        _setSwapper(_l, _swapper);
    }

    /**
     * @inheritdoc IZap
     */
    function setMerkleProof(address _vault, bytes32[] memory _merkleProof) external override onlyOwner {
        ZapStorage.Layout storage _l = ZapStorage.layout();

        _setMerkleProof(_l, _vault, _merkleProof);
    }
}
