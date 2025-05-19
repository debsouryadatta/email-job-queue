import { Resend } from "resend";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Get queue length
async function getQueueStatus() {
  try {
    const queueLength = await redis.llen(process.env.REDIS_QUEUE_KEY!);
    return { success: true, queueLength };
  } catch (error) {
    console.error("Error getting queue status:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Function to get a job from the queue
async function fetchNextJob() {
  try {
    // Pop a job from the right end of the list (oldest job first)
    const jobString = await redis.rpop(process.env.REDIS_QUEUE_KEY!);

    if (jobString) {
      // Parse the job data
      const job = JSON.parse(jobString);

      // Add processed timestamp
      job.processedAt = new Date().toISOString();

      console.log("Job fetched:", job);
      return { success: true, job };
    } else {
      return { success: true, job: null };
    }
  } catch (error) {
    console.error("Error fetching job:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Function to process a job i.e. send an email
async function processJob(job: any) {
  console.log(job);

  const { data, error } = await resend.emails.send({
    from: `email@${process.env.RESEND_VERIFIED_DOMAIN}`,
    to: [...job.emails],
    subject: "Mail from ClipDrive",
    html: job.message,
  });

  if (error) {
    console.error("Error sending email:", error);
  } else {
    console.log("Email sent successfully:", data);
  }
}

// Function to check queue and process jobs
async function processQueue() {
  const queueStatus = await getQueueStatus();

  if (
    queueStatus.success &&
    queueStatus.queueLength &&
    queueStatus.queueLength > 0
  ) {
    console.log(`Found ${queueStatus.queueLength} jobs in queue`);

    // Process all jobs in the queue
    for (let i = 0; i < queueStatus.queueLength; i++) {
      const jobResult = await fetchNextJob();

      if (jobResult.success && jobResult.job) {
        await processJob(jobResult.job);
      }
    }
  }
}

// Start processing queue at intervals
setInterval(processQueue, 10000);

// Initial call to start processing immediately
processQueue();


