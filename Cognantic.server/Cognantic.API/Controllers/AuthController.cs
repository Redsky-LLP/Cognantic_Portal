using Microsoft.AspNetCore.Mvc;
using Cognantic.Application.Common;
using Cognantic.Application.Features.Auth;
using Cognantic.Application.Features.Auth.Recovery;
using MediatR;
using Cognantic.Application.Features.Auth.Login;
using Cognantic.Application.Features.Auth.Register;

namespace Cognantic.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(Result<Auth_LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] Auth_LoginRequest request)
    {
        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(Result<Auth_RegisterResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] Auth_RegisterRequest request)
    {
        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    [HttpPost("forgot-password")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var userExists = await _mediator.Send(new CheckUserExistsQuery { Email = request.Email });

        if (userExists)
        {
            var emailSent = await _mediator.Send(new SendRecoveryEmailCommand { Email = request.Email });
            if (!emailSent)
                return StatusCode(500, Result<bool>.Failure("Email delivery failed. Please try again shortly."));
        }

        return Ok(Result<bool>.Success(true, "If that email exists in our system, a recovery link has been sent."));
    }

    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(Result<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}