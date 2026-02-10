// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { hash } from "bcryptjs";
// import { verifyRecaptcha } from "@/lib/verifyRecaptcha";


// function validatePassword(password: string) {
//   const errors = [];

//   if (password.length < 8) errors.push("at least 8 characters");
//   if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
//   if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
//   if (!/[0-9]/.test(password)) errors.push("one number");
//   if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
//     errors.push("one special character");

//   return {
//     valid: errors.length === 0,
//     errors,
//   };
// }

// export async function POST(req: NextRequest) {
//   try {
//     const { username, email, password } = await req.json();

//     const { recaptchaToken } = await req.json();
    
//       if (!recaptchaToken) {
//         return NextResponse.json(
//           { error: "Missing recaptcha token" },
//           { status: 400 }
//         );
//       }
    
//       const captcha = await verifyRecaptcha(recaptchaToken);
    
//       if (!captcha.success || captcha.score < 0.5) {
//         return NextResponse.json(
//           { error: "Bot activity detected" },
//           { status: 403 }
//         );
//       }

//     if (!username || !email || !password) {
//       return NextResponse.json({ error: "Missing fields" }, { status: 400 });
//     }

//     const passwordCheck = validatePassword(password);
//     if (!passwordCheck.valid) {
//       return NextResponse.json(
//         {
//           error: `Password must contain ${passwordCheck.errors.join(", ")}`,
//         },
//         { status: 400 }
//       );
//     }


//     // Check if username already exists
//     const existingUser = await prisma.user.findUnique({
//       where: { username },
//     });

//     if (existingUser) {
//       return NextResponse.json({ error: "Username already taken" }, { status: 400 });
//     }

//     // Optionally check if email already exists
//     const existingEmail = await prisma.user.findUnique({
//       where: { email },
//     });

//     if (existingEmail) {
//       return NextResponse.json({ error: "Email already registered" }, { status: 400 });
//     }

//     const hashedPassword = await hash(password, 12);

//     const user = await prisma.user.create({
//       data: {
//         username,
//         email,
//         subscriptionPlan: "free",
//         aiDifficulty: "easy",
//         password: hashedPassword,
//       },
//     });

//     return NextResponse.json({ user });
//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json({ error: err.message || "Signup failed" }, { status: 500 });
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { verifyRecaptcha } from "@/lib/verifyRecaptcha";

function validatePassword(password: string) {
  const errors = [];

  if (password.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("one number");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
    errors.push("one special character");

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Read the request body ONCE and store it
    const body = await req.json();
    const { username, email, password, recaptchaToken } = body;

    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "Missing recaptcha token" },
        { status: 400 }
      );
    }

    const captcha = await verifyRecaptcha(recaptchaToken);

    if (!captcha.success || captcha.score < 0.5) {
      return NextResponse.json(
        { error: "Bot activity detected" },
        { status: 403 }
      );
    }

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        {
          error: `Password must contain ${passwordCheck.errors.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    // Optionally check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        subscriptionPlan: "free",
        aiDifficulty: "easy",
        password: hashedPassword,
      },
    });

    // Remove password from response for security
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Signup failed" }, { status: 500 });
  }
}