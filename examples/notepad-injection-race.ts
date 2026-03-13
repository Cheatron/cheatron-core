import { spawn } from 'bun';
import { Target } from '../src/target';

async function runExample() {
  console.log('--- Cheatron Notepad Injection Race Example ---');

  // 1. Start notepad.exe for testing
  console.log('Starting notepad.exe...');
  const child = spawn(['notepad.exe'], { stdout: 'ignore', stderr: 'ignore' });
  
  // Wait a bit for the process to initialize
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!child.pid) {
    console.error('Failed to start notepad.exe');
    return;
  }

  try {
    // 2. Discover the target
    console.log(`Discovering target for PID ${child.pid}...`);
    const target = Target.fromPid(child.pid);
    console.log(`Target found: ${target.name} (PID: ${target.pid})`);

    // 3. Start the injection race
    console.log('Starting injection race across all threads...');
    console.log('Goal: Grab the FIRST thread that responds and abort others.');

    // We use target.injectAll() which uses AdvancedNThread.injectMany() under the hood
    const generator = target.injectAll({ count: 1 });

    let capturedDetails = null;

    // Use for-await-of for clear generator consumption
    for await (const [proxy, captured] of generator) {
      console.log(`SUCCESS! Hijacked thread TID: ${captured.tid}`);
      
      // We can use the proxy immediately
      const { AdvancedNThread } = await import('../src/advanced-nthread');
      const nt = new AdvancedNThread();
      
      const cwd = await nt.pwd(proxy);
      console.log(`Current Working Directory in target: ${cwd}`);

      capturedDetails = { proxy, captured };

      // We break here to stop the race. 
      // The generator's 'finally' block will automatically call abort() 
      // on the internal AbortController, stopping all other pending injections.
      break; 
    }

    if (!capturedDetails) {
      console.error('No threads responded to injection.');
    } else {
      console.log('Injection race complete. Cleaning up...');
      await target.detachAll();
      console.log('Disconnected all channels.');
    }

  } catch (err) {
    console.error('An error occurred during the example:');
    console.error(err instanceof Error ? err.message : String(err));
  } finally {
    // 4. Kill the notepad process
    console.log('Closing notepad.exe...');
    child.kill();
  }
}

runExample().catch(console.error);
