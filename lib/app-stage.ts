import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SsarpStack } from './ssarp-stack';

export class SsarpAppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    // This puts our entire application from Phase 4 into a "Stage" box
    new SsarpStack(this, 'SsarpApplication');
  }
}
