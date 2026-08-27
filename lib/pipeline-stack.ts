import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { SsarpAppStage } from './app-stage';

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create the automated CI/CD Courier
    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'SSARP-Deployment-Pipeline',
      
      // 2. Tell the courier to watch your GitHub repo using your exact ARN!
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection('theimaginaryangel/Serverless-Security-Alert-Response-Pipeline', 'main', {
          connectionArn: 'arn:aws:codeconnections:eu-north-1:496795891920:connection/f176fe28-6469-4a3d-bd66-c3fdcaa83d16',
        }),
        
        // 3. The instructions the courier runs to build the app
        commands: ['npm ci', 'npm run build', 'npx cdk synth']
      })
    });

    // 4. Tell the pipeline to deploy our Stage (the whole application box)
    pipeline.addStage(new SsarpAppStage(this, 'Deploy-Production'));
  }
}
