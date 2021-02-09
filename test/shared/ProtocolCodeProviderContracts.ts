import {CodeProviderContract} from "./interfaces";
import CompoundCodeProvider from "../../build/CompoundCodeProvider.json";
import AaveV1CodeProvider from "../../build/AaveV1CodeProvider.json";
import AaveV2CodeProvider from "../../build/AaveV2CodeProvider.json";
import CurvePoolCodeProvider from "../../build/CurvePoolCodeProvider.json";
import CurveSwapCodeProvider from "../../build/CurveSwapCodeProvider.json";
import CreamCodeProvider from "../../build/CreamCodeProvider.json";
import DForceCodeProvider from "../../build/DForceCodeProvider.json";
import FulcrumCodeProvider from "../../build/FulcrumCodeProvider.json";
import HarvestCodeProvider from "../../build/HarvestCodeProvider.json";
import YVaultCodeProvider from "../../build/YVaultCodeProvider.json";
import YearnCodeProvider from "../../build/YearnCodeProvider.json"
import dYdXCodeProvider from "../../build/dYdXCodeProvider.json";

//  Json of CodeProviderContract for storing the Abi's of CodeProviderContracts
let codeProviderContract: CodeProviderContract = {
    CompoundCodeProvider: CompoundCodeProvider,
    AaveV1CodeProvider: AaveV1CodeProvider,
    FulcrumCodeProvider: FulcrumCodeProvider,
    DForceCodeProvider: DForceCodeProvider,
    HarvestCodeProvider: HarvestCodeProvider,
    YVaultCodeProvider: YVaultCodeProvider,
    CurvePoolCodeProvider: CurvePoolCodeProvider,
    CurveSwapCodeProvider: CurveSwapCodeProvider,
    dYdXCodeProvider: dYdXCodeProvider,
    CreamCodeProvider: CreamCodeProvider,
    AaveV2CodeProvider: AaveV2CodeProvider,
    YearnCodeProvider: YearnCodeProvider,
};

export {
    codeProviderContract
}
