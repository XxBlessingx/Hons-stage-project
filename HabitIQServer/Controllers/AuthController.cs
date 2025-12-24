using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    // FR1: Account Creation
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        try
        {
            var args = new UserRecordArgs()
            {
                Email = dto.Email,
                Password = dto.Password
            };

            var userRecord = await FirebaseAuth.DefaultInstance.CreateUserAsync(args);

            return Ok(new { uid = userRecord.Uid, message = "Account created successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public record RegisterDto(string Email, string Password);
