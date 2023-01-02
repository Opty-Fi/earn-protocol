export interface PoolItem {
  pool: string;
  lpToken: string;
  tokens: string[];
}

export interface LiquidityPool {
  [name: string]: PoolItem;
}
