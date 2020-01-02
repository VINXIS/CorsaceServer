// General middlewares
async function isLoggedIn(ctx, next) {
    if (!ctx.state.user) {
        return ctx.body = { error: "No user found!" }
    }

   return next()
}

async function isStaff(ctx, next) {
    if (!ctx.state.user.discord.accessToken) {
        return ctx.body = { error: "User is not logged in via discord!" }
    }
}

async function hasRole(section: String, role: String) {
    return async (ctx, next) => {
        next()
    }
}

const isCorsace = hasRole("corsace", "corsace")

export { isLoggedIn }