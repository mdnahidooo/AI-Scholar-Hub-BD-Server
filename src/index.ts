import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import type { Db } from "mongodb";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

const app = express();

const PORT: number = Number(process.env.PORT) || 5000;
const MONGO_DB_URI: string = process.env.MONGO_DB_URI as string;
const CLIENT_URL: string =
    process.env.CLIENT_URL || "http://localhost:3000";

const DB_NAME: string = process.env.DB_NAME || "ScholarHubDB";


// Middleware
app.use(
    cors({
        origin: CLIENT_URL,
        credentials: true,
    })
);




// MongoDB Atlas Client
const client = new MongoClient(MONGO_DB_URI);

let database: Db;

const connectDB = async (): Promise<Db> => {
    try {
        if (database) {
            return database;
        }

        await client.connect();

        database = client.db(DB_NAME);

        console.log("MongoDB Atlas connected successfully");

        return database;
    } catch (error) {
        if (error instanceof Error) {
            console.error(
                "MongoDB connection failed:",
                error.message
            );
        } else {
            console.error(
                "MongoDB connection failed",
                error
            );
        }

        throw error;
    }
};


app.use(express.json());

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database connection failed",
        });
    }
});


interface Scholarship {
    title: string;

    universityName: string;

    universityLogo?: string;

    country: string;

    city: string;

    category:
    | "Bachelor"
    | "Masters"
    | "PhD";

    subjectCategory: string;

    scholarshipType:
    | "Full Funded"
    | "Partial Funded"
    | "Self Funded";

    degree: string;

    tuitionFee: number;

    applicationFee: number;

    serviceCharge: number;

    deadline: string;

    shortDescription: string;

    description: string;

    eligibility: string;

    websiteLink?: string;

    createdAt: Date;
}




// Test Route
app.get(
    "/",
    (req: Request, res: Response): void => {

        res.status(200).json({
            success: true,
            message: "Scholar Hub BD API is running!",
        });

    }
);





app.get(
    "/ai/test",
    async (
        req: Request,
        res: Response
    ): Promise<void> => {

        try {

            const response =
                await ai.models.generateContent({

                    model: "gemini-flash-latest",

                    contents:
                        "Explain scholarship in one sentence."

                });


            res.status(200).json({

                success: true,

                reply:
                    response.text

            });


        } catch (error) {

            console.error(
                "Gemini Error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error"

            });

        }

    }
);



app.post(
    "/ai/chat",
    async (
        req: Request,
        res: Response
    ): Promise<void> => {

        try {

            const { message } = req.body;


            if (!message) {

                res.status(400).json({

                    success: false,

                    message:
                        "Message is required"

                });

                return;

            }


            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-flash-latest",

                    contents:
                        message,

                });



            res.status(200).json({

                success: true,

                reply:
                    response.text,

            });



        } catch (error) {


            console.error(
                "AI Chat Error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error"

            });


        }

    }
);



app.post(
    "/ai/advisor",
    async (
        req: Request,
        res: Response
    ): Promise<void> => {

        try {

            const { message } = req.body;


            if (!message) {

                res.status(400).json({

                    success: false,

                    message:
                        "Message is required"

                });

                return;

            }



            // 1. Get scholarship data from MongoDB

            const scholarships =
                await database
                    .collection("scholarships")
                    .find({})
                    .limit(20)
                    .toArray();



            // 2. Create AI prompt

            const prompt = `

You are an AI Scholarship Advisor Agent.


Student Requirement:

${message}



Available Scholarship Database:

${JSON.stringify(
                scholarships
            )}



Your task:

Analyze the student's profile.

Recommend the most suitable scholarships from the database.

For each recommendation include:

- Scholarship name
- University
- Country
- Degree level
- Funding type
- Deadline
- Why this matches the student


Important:
Only recommend scholarships from the provided database.


`;



            // 3. Ask Gemini

            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-flash-latest",

                    contents:
                        prompt,

                });



            // 4. Return AI answer

            res.status(200).json({

                success: true,

                recommendation:
                    response.text,

            });



        } catch (error) {


            console.error(
                "AI Advisor Error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error"

            });

        }

    }
);




// Users Route Example
app.get(
    "/users",
    async (
        req: Request,
        res: Response
    ): Promise<void> => {

        try {

            const users = await database
                .collection("users")
                .find()
                .toArray();


            res.status(200).json({
                success: true,
                data: users,
            });


        } catch (error) {

            res.status(500).json({
                success: false,
                message: "Failed to fetch users",
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });

        }

    }
);


app.post(
    "/scholarships",
    async (
        req: Request,
        res: Response
    ): Promise<void> => {

        try {

            const scholarship: Scholarship = {

                ...req.body,

                createdAt: new Date(),

            };

            const result = await database
                .collection("scholarships")
                .insertOne(scholarship);

            res.status(201).json({
                success: true,
                message:
                    "Scholarship added successfully",
                insertedId: result.insertedId,
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message:
                    "Failed to add scholarship",
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });

        }

    }
);



app.get(
    "/featured-scholarships",
    async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const featuredScholarships =
                await database
                    .collection("scholarships")
                    .find()
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .toArray();

            res.status(200).json({
                success: true,
                data: featuredScholarships,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch featured scholarships",
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }
);



app.get(
    "/scholarships",
    async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const search =
                (req.query.search as string) || "";

            const category =
                (req.query.category as string) || "";

            const scholarshipType =
                (req.query.scholarshipType as string) || "";

            const sort =
                (req.query.sort as string) || "latest";

            const page = Number(req.query.page) || 1;

            const limit =
                Number(req.query.limit) || 8;

            const skip =
                (page - 1) * limit;

            const filter: Record<
                string,
                unknown
            > = {};

            // Search
            if (search) {
                filter.$or = [
                    {
                        title: {
                            $regex: search,
                            $options: "i",
                        },
                    },
                    {
                        universityName: {
                            $regex: search,
                            $options: "i",
                        },
                    },
                    {
                        subjectCategory: {
                            $regex: search,
                            $options: "i",
                        },
                    },
                ];
            }

            // Category Filter
            if (category) {
                filter.category =
                    category;
            }

            // Scholarship Type Filter
            if (scholarshipType) {
                filter.scholarshipType =
                    scholarshipType;
            }

            let sortOption: Record<
                string,
                1 | -1
            > = {
                createdAt: -1,
            };

            // Sorting
            switch (sort) {
                case "deadline":
                    sortOption = {
                        deadline: 1,
                    };
                    break;

                case "tuitionLow":
                    sortOption = {
                        tuitionFee: 1,
                    };
                    break;

                case "tuitionHigh":
                    sortOption = {
                        tuitionFee: -1,
                    };
                    break;

                default:
                    sortOption = {
                        createdAt: -1,
                    };
            }

            const collection =
                database.collection(
                    "scholarships"
                );

            const total =
                await collection.countDocuments(
                    filter
                );

            const scholarships =
                await collection
                    .find(filter)
                    .sort(sortOption)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

            res.status(200).json({
                success: true,
                data: scholarships,
                pagination: {
                    total,
                    currentPage: page,
                    totalPages: Math.ceil(
                        total / limit
                    ),
                    limit,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch scholarships",
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }
);



// app.get(
//     "/scholarships",
//     async (
//         req: Request,
//         res: Response
//     ): Promise<void> => {

//         try {

//             const scholarships =
//                 await database
//                     .collection("scholarships")
//                     .find()
//                     .sort({ createdAt: -1 })
//                     .toArray();

//             res.status(200).json({
//                 success: true,
//                 data: scholarships,
//             });

//         } catch (error) {

//             res.status(500).json({
//                 success: false,
//                 message:
//                     "Failed to fetch scholarships",
//                 error:
//                     error instanceof Error
//                         ? error.message
//                         : "Unknown error",
//             });

//         }

//     }
// );


// app.get(
//     "/scholarships/:id",
//     async (
//         req: Request,
//         res: Response
//     ): Promise<void> => {
//         try {
//             const scholarship =
//                 await database
//                     .collection("scholarships")
//                     .findOne({
//                         _id: new ObjectId(
//                             req.params.id
//                         ),
//                     });

//             if (!scholarship) {
//                 res.status(404).json({
//                     success: false,
//                     message:
//                         "Scholarship not found",
//                 });

//                 return;
//             }

//             res.status(200).json({
//                 success: true,
//                 data: scholarship,
//             });
//         } catch (error) {
//             res.status(500).json({
//                 success: false,
//                 message:
//                     "Failed to fetch scholarship",
//             });
//         }
//     }
// );



app.get(
    "/scholarships/:id",
    async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = String(req.params.id);

            const scholarship =
                await database
                    .collection("scholarships")
                    .findOne({
                        _id: new ObjectId(id),
                    });

            if (!scholarship) {
                res.status(404).json({
                    success: false,
                    message:
                        "Scholarship not found",
                });

                return;
            }

            res.status(200).json({
                success: true,
                data: scholarship,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch scholarship",
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }
);

// app.delete(
//     "/scholarships/:id",
//     async (
//         req: Request,
//         res: Response
//     ): Promise<void> => {
//         try {
//             const { id } = req.params;

//             const result =
//                 await database
//                     .collection("scholarships")
//                     .deleteOne({
//                         _id: new ObjectId(id),
//                     });

//             if (result.deletedCount === 0) {
//                 res.status(404).json({
//                     success: false,
//                     message:
//                         "Scholarship not found",
//                 });

//                 return;
//             }

//             res.status(200).json({
//                 success: true,
//                 message:
//                     "Scholarship deleted successfully",
//             });
//         } catch (error) {
//             res.status(500).json({
//                 success: false,
//                 message:
//                     "Failed to delete scholarship",
//                 error:
//                     error instanceof Error
//                         ? error.message
//                         : "Unknown error",
//             });
//         }
//     }
// );



app.delete(
    "/scholarships/:id",
    async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = String(req.params.id);

            const result =
                await database
                    .collection("scholarships")
                    .deleteOne({
                        _id: new ObjectId(id),
                    });

            if (result.deletedCount === 0) {
                res.status(404).json({
                    success: false,
                    message:
                        "Scholarship not found",
                });

                return;
            }

            res.status(200).json({
                success: true,
                message:
                    "Scholarship deleted successfully",
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    "Failed to delete scholarship",
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }
);








export default app;

// Start Server
// const startServer = async (): Promise<void> => {

//     await connectDB();

//     app.listen(PORT, (): void => {

//         console.log(`Server running on http://localhost:${PORT}`);

//     });

// };


// startServer();


