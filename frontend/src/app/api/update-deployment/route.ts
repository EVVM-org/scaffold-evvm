import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const deploymentConfig = await request.json();

    // Validate the configuration
    if (!deploymentConfig.evvm || !deploymentConfig.chainId) {
      return NextResponse.json(
        { error: 'Missing required fields: evvm and chainId' },
        { status: 400 }
      );
    }

    // Path to the deployment summary file
    // process.cwd() is the frontend directory
    // Go up one level to "The New Scaffold-EVVM" then into contracts/input
    const filePath = path.join(
      process.cwd(),
      '..',
      'contracts',
      'input',
      'evvmDeploymentSummary.json'
    );

    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    await mkdir(dirPath, { recursive: true });

    // Write the configuration to the file
    await writeFile(filePath, JSON.stringify(deploymentConfig, null, 2), 'utf-8');

    console.log('✅ Deployment configuration saved to:', filePath);
    console.log('  EVVM:', deploymentConfig.evvm);
    console.log('  Chain:', deploymentConfig.networkName, `(${deploymentConfig.chainId})`);
    console.log('  EVVM ID:', deploymentConfig.evvmID);

    return NextResponse.json({
      success: true,
      message: 'Deployment configuration saved successfully',
      config: deploymentConfig,
    });
  } catch (error: any) {
    console.error('Error saving deployment configuration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
