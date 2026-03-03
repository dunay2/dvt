import { z } from 'zod';
export declare const WorkflowStepTypeSchema: z.ZodEnum<{
    task: "task";
    gateway: "gateway";
}>;
export declare const WorkflowStepSchema: z.ZodObject<{
    stepId: z.ZodString;
    type: z.ZodEnum<{
        task: "task";
        gateway: "gateway";
    }>;
    dependsOn: z.ZodArray<z.ZodString>;
    gateway: z.ZodOptional<z.ZodObject<{
        dslVersion: z.ZodLiteral<"1.0">;
        expression: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const PlannerInputEnvelopeSchema: z.ZodObject<{
    version: z.ZodLiteral<"1.0">;
    workflowSpec: z.ZodObject<{
        workflowId: z.ZodString;
        steps: z.ZodArray<z.ZodObject<{
            stepId: z.ZodString;
            type: z.ZodEnum<{
                task: "task";
                gateway: "gateway";
            }>;
            dependsOn: z.ZodArray<z.ZodString>;
            gateway: z.ZodOptional<z.ZodObject<{
                dslVersion: z.ZodLiteral<"1.0">;
                expression: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    executionIntent: z.ZodObject<{
        type: z.ZodEnum<{
            resume: "resume";
            full: "full";
            partial: "partial";
        }>;
        selection: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
    environment: z.ZodObject<{
        target: z.ZodEnum<{
            production: "production";
            staging: "staging";
            test: "test";
        }>;
    }, z.core.$strip>;
    engineHints: z.ZodOptional<z.ZodObject<{
        requiredCapabilities: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PlannerInputEnvelope = z.infer<typeof PlannerInputEnvelopeSchema>;
//# sourceMappingURL=planner-input.d.ts.map