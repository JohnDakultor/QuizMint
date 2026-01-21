import {prisma} from "@/lib/prisma";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";


export async function POST(request: Request) {
    const body = await request.json();

    const { email, password } = body;

    if (!email || !password) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const passwordMatch = user.password ? await compare(password, user.password) : false;

    if (!passwordMatch) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    return NextResponse.json({ user }, { status: 200 });
}